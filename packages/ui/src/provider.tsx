import { createContext, forwardRef, useContext, type AnchorHTMLAttributes, type ComponentType, type ReactNode } from 'react';

export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
/** Enhver link-komponent der tager href + anchor-props, fx `next/link`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type LinkComponent = ComponentType<any>;

const DefaultLink = forwardRef<HTMLAnchorElement, LinkProps>(function DefaultLink(props, ref) {
  return <a ref={ref} {...props} />;
});

const LinkContext = createContext<LinkComponent>(DefaultLink);

export interface RespinProviderProps {
  /** Send `next/link` ind her, så alle kit-links bruger Next.js klient-navigation. */
  linkComponent?: LinkComponent;
  children?: ReactNode;
}

export function RespinProvider({ linkComponent, children }: RespinProviderProps) {
  return <LinkContext.Provider value={linkComponent ?? DefaultLink}>{children}</LinkContext.Provider>;
}

/** Intern: renderer et link via den konfigurerede link-komponent. */
export const AppLink = forwardRef<HTMLAnchorElement, LinkProps>(function AppLink(props, ref) {
  const Link = useContext(LinkContext);
  return <Link ref={ref} {...props} />;
});
