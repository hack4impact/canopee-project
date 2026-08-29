'use client'

import { useActionState, useState } from 'react'
import { logout } from '@/app/login/actions'
import {
  changePassword,
  deleteAccount,
  type DeleteAccountState,
  type PasswordChangeState,
} from '@/app/profil/actions'
import { MIN_PASSWORD_LENGTH } from '@/lib/auth/validation'

const BOX = 'overflow-hidden rounded-xl border bg-white'

const ROW =
  'flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm font-bold transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:outline-none'

const PANEL = 'flex flex-col gap-2 border-t p-3'

const FIELD =
  'w-full rounded-lg border border-canopee-forest/20 bg-canopee-cream/40 px-3 py-2 text-sm text-canopee-forest focus-visible:border-canopee-green focus-visible:ring-2 focus-visible:ring-canopee-green/30 focus-visible:outline-none'

const LABEL = 'text-[11px] font-bold text-canopee-forest/70'

const ERROR = 'text-[11px] font-semibold text-canopee-coral-dark'

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`h-3.5 w-3.5 opacity-45 transition-transform duration-150 ${
        open ? 'rotate-90' : ''
      }`}
      aria-hidden="true"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

export function AccountSection() {
  const [openPanel, setOpenPanel] = useState<'password' | 'delete' | null>(null)

  const [passwordState, submitPassword, passwordPending] = useActionState<
    PasswordChangeState,
    FormData
  >(changePassword, {})

  const [deleteState, submitDelete, deletePending] = useActionState<
    DeleteAccountState,
    FormData
  >(deleteAccount, {})

  function toggle(panel: 'password' | 'delete') {
    setOpenPanel((current) => (current === panel ? null : panel))
  }

  const passwordOpen = openPanel === 'password'
  const deleteOpen = openPanel === 'delete'

  return (
    <section className="flex flex-col gap-1.5">
      <h2 className="text-[10px] font-extrabold tracking-[0.1em] text-canopee-forest/50 uppercase">
        Compte
      </h2>

      <div className={`${BOX} border-canopee-forest/20`}>
        <button
          type="button"
          onClick={() => toggle('password')}
          aria-expanded={passwordOpen}
          className={`${ROW} text-canopee-forest hover:bg-canopee-green/5 focus-visible:ring-canopee-green`}
        >
          <span className="flex-1">Changer le mot de passe</span>
          <Chevron open={passwordOpen} />
        </button>

        {passwordOpen && (
          <form
            action={submitPassword}
            className={`${PANEL} border-canopee-forest/10`}
          >
            <label className="flex flex-col gap-1">
              <span className={LABEL}>Mot de passe actuel</span>
              <input
                type="password"
                name="currentPassword"
                autoComplete="current-password"
                required
                className={FIELD}
              />
              {passwordState.errors?.currentPassword && (
                <span className={ERROR}>
                  {passwordState.errors.currentPassword}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1">
              <span className={LABEL}>Nouveau mot de passe</span>
              <input
                type="password"
                name="password"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
                required
                className={FIELD}
              />
              {passwordState.errors?.password && (
                <span className={ERROR}>{passwordState.errors.password}</span>
              )}
            </label>

            <label className="flex flex-col gap-1">
              <span className={LABEL}>Confirmer le nouveau mot de passe</span>
              <input
                type="password"
                name="confirmPassword"
                autoComplete="new-password"
                required
                className={FIELD}
              />
              {passwordState.errors?.confirmPassword && (
                <span className={ERROR}>
                  {passwordState.errors.confirmPassword}
                </span>
              )}
            </label>

            {passwordState.message && (
              <p role="alert" className={ERROR}>
                {passwordState.message}
              </p>
            )}

            {passwordState.done && (
              <p
                role="status"
                className="text-[11px] font-semibold text-canopee-green"
              >
                Mot de passe modifié.
              </p>
            )}

            <button
              type="submit"
              disabled={passwordPending}
              className="mt-1 rounded-lg bg-canopee-green px-3 py-2 text-xs font-extrabold text-white transition-colors hover:bg-canopee-forest focus-visible:ring-2 focus-visible:ring-canopee-lime focus-visible:outline-none disabled:opacity-60"
            >
              {passwordPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </form>
        )}
      </div>

      <div className={`${BOX} border-canopee-coral/40`}>
        <button
          type="button"
          onClick={() => toggle('delete')}
          aria-expanded={deleteOpen}
          className={`${ROW} text-canopee-coral-dark hover:bg-canopee-coral/5 focus-visible:ring-canopee-coral`}
        >
          <span className="flex-1">Supprimer mon compte</span>
          <Chevron open={deleteOpen} />
        </button>

        {deleteOpen && (
          <form
            action={submitDelete}
            className={`${PANEL} border-canopee-coral/25`}
          >
            <p className="text-[11px] leading-snug text-canopee-forest">
              Vos patrouilles et leurs trajets seront supprimés définitivement.
              Vos signalements sont conservés pour Canopée, mais ne seront plus
              liés à votre compte. Cette action est irréversible.
            </p>

            <label className="flex flex-col gap-1">
              <span className={LABEL}>Saisissez SUPPRIMER pour confirmer</span>
              <input
                type="text"
                name="confirmation"
                autoComplete="off"
                required
                className={FIELD}
              />
            </label>

            {deleteState.message && (
              <p role="alert" className={ERROR}>
                {deleteState.message}
              </p>
            )}

            <button
              type="submit"
              disabled={deletePending}
              className="mt-1 rounded-lg bg-canopee-coral px-3 py-2 text-xs font-extrabold text-white transition-colors hover:bg-canopee-coral-dark focus-visible:ring-2 focus-visible:ring-canopee-coral focus-visible:outline-none disabled:opacity-60"
            >
              {deletePending ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
          </form>
        )}
      </div>

      <form action={logout} className={`${BOX} border-canopee-forest/20`}>
        <button
          type="submit"
          className={`${ROW} text-canopee-forest hover:bg-canopee-green/5 focus-visible:ring-canopee-green`}
        >
          <span className="flex-1">Se déconnecter</span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5 opacity-45"
            aria-hidden="true"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5" />
            <path d="M21 12H9" />
          </svg>
        </button>
      </form>
    </section>
  )
}
