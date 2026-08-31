import Foundation
import UIKit

@objc public final class PatrolPointQueue: NSObject {
    @objc public static let shared = PatrolPointQueue()

    public static let backgroundEventsNotification = Notification.Name(
        "CanopeePatrolBackgroundURLSessionEvents"
    )

    private static let sessionIdentifier = "org.reseaucanopee.app.patrol-upload"
    private static let maxBatch = 200
    private static let maxBuffered = 10_000

    private let queue = DispatchQueue(label: "org.reseaucanopee.patrol-point-queue")

    private var endpoint: URL?
    private var headers: [String: String] = [:]
    private var nextId: UInt64?
    private var uploading = false
    private var appendsSinceTrim = 0

    private var backgroundCompletion: (() -> Void)?

    private lazy var session: URLSession = {
        let configuration = URLSessionConfiguration.background(
            withIdentifier: PatrolPointQueue.sessionIdentifier
        )
        configuration.sessionSendsLaunchEvents = true
        configuration.isDiscretionary = false
        configuration.allowsCellularAccess = true
        return URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
    }()

    private override init() {
        super.init()

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleBackgroundEvents(_:)),
            name: PatrolPointQueue.backgroundEventsNotification,
            object: nil
        )

        queue.async {
            self.endpoint = self.restoredEndpoint()
        }
    }

    private var configURL: URL {
        directory.appendingPathComponent("endpoint.json")
    }

    private func persistEndpoint(_ url: URL?) {
        guard let url else {
            try? FileManager.default.removeItem(at: configURL)
            return
        }

        let stored: [String: Any] = ["url": url.absoluteString]

        guard let data = try? JSONSerialization.data(withJSONObject: stored) else { return }

        try? data.write(to: configURL, options: .atomic)
    }

    private func restoredEndpoint() -> URL? {
        guard let data = try? Data(contentsOf: configURL),
              let stored = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let text = stored["url"] as? String else {
            return nil
        }

        return URL(string: text)
    }

    @objc private func handleBackgroundEvents(_ notification: Notification) {
        guard let identifier = notification.userInfo?["identifier"] as? String,
              identifier == PatrolPointQueue.sessionIdentifier,
              let completion = notification.userInfo?["completionHandler"] as? () -> Void else {
            return
        }

        setBackgroundCompletion(completion)
    }

    @objc public func configure(url: URL?, headers: [String: String]) {
        queue.async {
            self.endpoint = url
            self.headers = headers
            self.persistEndpoint(url)

            guard url != nil else { return }

            _ = self.session
        }

        drain()
    }

    @objc public func updateHeaders(_ headers: [String: String]) {
        queue.async {
            self.headers = headers

            guard self.endpoint != nil else { return }

            _ = self.session
        }

        drain()
    }

    @objc public func setBackgroundCompletion(_ completion: @escaping () -> Void) {
        queue.async {
            self.backgroundCompletion = completion
            _ = self.session
        }
    }

    @objc public func enqueue(_ payload: [String: Any]) {
        queue.async {
            guard self.endpoint != nil else { return }
            guard JSONSerialization.isValidJSONObject(payload) else { return }

            let id = self.reserveId()
            let line: [String: Any] = ["id": NSNumber(value: id), "p": payload]

            guard let data = try? JSONSerialization.data(withJSONObject: line) else { return }

            var bytes = data
            bytes.append(0x0A)
            self.appendBytes(bytes)
            self.trimIfNeeded()
        }

        drain()
    }

    @objc public func drain() {
        queue.async {
            guard !self.uploading, !self.headers.isEmpty, let endpoint = self.endpoint else { return }

            let buffered = self.readBuffered()

            guard let first = buffered.first else { return }

            let batch = Array(buffered.prefix(PatrolPointQueue.maxBatch))
            let last = batch[batch.count - 1]
            let payloads = batch.map { $0.payload }

            guard JSONSerialization.isValidJSONObject(payloads),
                  let body = try? JSONSerialization.data(withJSONObject: payloads) else {
                self.removeRange(from: first.id, to: last.id)
                return
            }

            let bodyURL = self.bodyURL(from: first.id, to: last.id)

            do {
                try body.write(to: bodyURL, options: .atomic)
            } catch {
                return
            }

            var request = URLRequest(url: endpoint)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.setValue("application/json", forHTTPHeaderField: "Accept")

            for (key, value) in self.headers {
                request.setValue(value, forHTTPHeaderField: key)
            }

            let task = self.session.uploadTask(with: request, fromFile: bodyURL)
            task.taskDescription = "\(first.id)-\(last.id)"

            self.uploading = true
            task.resume()
        }
    }

    private func finish(taskDescription: String?, accepted: Bool) {
        queue.async {
            self.uploading = false

            guard let range = taskDescription, let bounds = PatrolPointQueue.bounds(of: range) else {
                return
            }

            try? FileManager.default.removeItem(at: self.bodyURL(from: bounds.first, to: bounds.last))

            guard accepted else { return }

            self.removeRange(from: bounds.first, to: bounds.last)
        }

        if accepted {
            drain()
        }
    }

    private static func bounds(of description: String) -> (first: UInt64, last: UInt64)? {
        let parts = description.split(separator: "-")

        guard parts.count == 2,
              let first = UInt64(parts[0]),
              let last = UInt64(parts[1]) else {
            return nil
        }

        return (first, last)
    }

    private var directory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let directory = base.appendingPathComponent("CanopeePatrol", isDirectory: true)

        if !FileManager.default.fileExists(atPath: directory.path) {
            try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        }

        return directory
    }

    private var fileURL: URL {
        directory.appendingPathComponent("points.jsonl")
    }

    private func bodyURL(from first: UInt64, to last: UInt64) -> URL {
        directory.appendingPathComponent("batch-\(first)-\(last).json")
    }

    private func reserveId() -> UInt64 {
        if let nextId {
            self.nextId = nextId + 1
            return nextId
        }

        let highest = readBuffered().last?.id
        let id = highest.map { $0 + 1 } ?? 0

        nextId = id + 1

        return id
    }

    private func appendBytes(_ bytes: Data) {
        let url = fileURL

        guard let handle = try? FileHandle(forWritingTo: url) else {
            try? bytes.write(to: url, options: .atomic)
            return
        }

        defer { try? handle.close() }

        do {
            try handle.seekToEnd()
            try handle.write(contentsOf: bytes)
        } catch {
            return
        }
    }

    private func readBuffered() -> [(id: UInt64, payload: [String: Any])] {
        guard let data = try? Data(contentsOf: fileURL),
              let text = String(data: data, encoding: .utf8) else {
            return []
        }

        var buffered: [(id: UInt64, payload: [String: Any])] = []

        for line in text.split(separator: "\n") {
            guard let lineData = line.data(using: .utf8),
                  let object = try? JSONSerialization.jsonObject(with: lineData) as? [String: Any],
                  let id = (object["id"] as? NSNumber)?.uint64Value,
                  let payload = object["p"] as? [String: Any] else {
                continue
            }

            buffered.append((id: id, payload: payload))
        }

        return buffered
    }

    private func trimIfNeeded() {
        appendsSinceTrim += 1

        guard appendsSinceTrim >= 500 else { return }

        appendsSinceTrim = 0

        let buffered = readBuffered()

        guard buffered.count > PatrolPointQueue.maxBuffered else { return }

        write(buffered)
    }

    private func removeRange(from first: UInt64, to last: UInt64) {
        let kept = readBuffered().filter { $0.id < first || $0.id > last }

        write(kept)
    }

    private func write(_ buffered: [(id: UInt64, payload: [String: Any])]) {
        let trimmed = buffered.count > PatrolPointQueue.maxBuffered
            ? Array(buffered.suffix(PatrolPointQueue.maxBuffered))
            : buffered

        var bytes = Data()

        for entry in trimmed {
            let line: [String: Any] = ["id": NSNumber(value: entry.id), "p": entry.payload]

            guard JSONSerialization.isValidJSONObject(line),
                  let data = try? JSONSerialization.data(withJSONObject: line) else {
                continue
            }

            bytes.append(data)
            bytes.append(0x0A)
        }

        try? bytes.write(to: fileURL, options: .atomic)
    }
}

extension PatrolPointQueue: URLSessionDataDelegate {
    public func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        didCompleteWithError error: Error?
    ) {
        let status = (task.response as? HTTPURLResponse)?.statusCode ?? 0

        let rejected = status == 400 || status == 413
        let accepted = error == nil && ((200..<300).contains(status) || rejected)

        finish(taskDescription: task.taskDescription, accepted: accepted)
    }

    public func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        queue.async {
            let completion = self.backgroundCompletion
            self.backgroundCompletion = nil

            guard let completion else { return }

            DispatchQueue.main.async(execute: completion)
        }
    }
}
