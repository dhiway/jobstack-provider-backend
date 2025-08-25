import { CookieOptions, GenericEndpointContext, User } from 'better-auth/*';
import { Session } from 'inspector/promises';

export const getDate = (span: number, unit: 'sec' | 'ms' = 'ms') => {
  return new Date(Date.now() + (unit === 'sec' ? span * 1000 : span));
};

export async function setSessionCookie(
  ctx: GenericEndpointContext,
  session: {
    session: Session & Record<string, any>;
    user: User;
  },
  dontRememberMe?: boolean,
  overrides?: Partial<CookieOptions>
) {
  const dontRememberMeCookie = await ctx.getSignedCookie(
    ctx.context.authCookies.dontRememberToken.name,
    ctx.context.secret
  );
  // if dontRememberMe is not set, use the cookie value
  dontRememberMe =
    dontRememberMe !== undefined ? dontRememberMe : !!dontRememberMeCookie;

  const options = ctx.context.authCookies.sessionToken.options;
  const maxAge = dontRememberMe
    ? undefined
    : ctx.context.sessionConfig.expiresIn;
  await ctx.setSignedCookie(
    ctx.context.authCookies.sessionToken.name,
    session.session.token,
    ctx.context.secret,
    {
      ...options,
      maxAge,
      ...overrides,
    }
  );

  if (dontRememberMe) {
    await ctx.setSignedCookie(
      ctx.context.authCookies.dontRememberToken.name,
      'true',
      ctx.context.secret,
      ctx.context.authCookies.dontRememberToken.options
    );
  }

  /* await setCookieCache(ctx, session); */
  ctx.context.setNewSession(session as any);
  /**
   * If secondary storage is enabled, store the session data in the secondary storage
   * This is useful if the session got updated and we want to update the session data in the
   * secondary storage
   */
  if (ctx.context.options.secondaryStorage) {
    await ctx.context.secondaryStorage?.set(
      session.session.token,
      JSON.stringify({
        user: session.user,
        session: session.session,
      }),
      Math.floor(
        (new Date(session.session.expiresAt).getTime() - Date.now()) / 1000
      )
    );
  }
}
