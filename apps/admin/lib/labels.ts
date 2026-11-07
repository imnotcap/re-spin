/** Farver på mærker i admin */
export const PRIORITY_TONE = { urgent: 'coral', high: 'warn', normal: 'neutral', low: 'neutral' } as const;
export const STATUS_TONE = { open: 'forest', pending_customer: 'warn', resolved: 'neutral', closed: 'neutral' } as const;
export const ORDER_TONE = { pending_payment: 'neutral', paid: 'forest', shipped: 'forest', delivered: 'forest', completed: 'neutral', disputed: 'coral', refunded: 'warn', cancelled: 'neutral', expired: 'neutral' } as const;

/** Standardsvar (makroer) – udfyldes i svarfeltet og kan rettes, før de sendes */
export const MACROS = [
  { id: 'hej', label: 'Hilsen', text: 'Hej {navn}\n\nTak, fordi du skrev til os. ' },
  { id: 'kigger', label: 'Vi kigger på det', text: 'Hej {navn}\n\nTak for din besked. Vi kigger på sagen og vender tilbage hurtigst muligt – senest inden for 1-2 hverdage.' },
  { id: 'info', label: 'Brug for mere info', text: 'Hej {navn}\n\nFor at kunne hjælpe har vi brug for lidt flere oplysninger:\n\n- Ordrenummer eller link til annoncen\n- Hvad skete der, og hvornår?\n- Billeder, hvis varen er beskadiget\n\nDu kan svare direkte her.' },
  { id: 'refunderet', label: 'Refunderet', text: 'Hej {navn}\n\nVi har nu refunderet købet. Pengene går tilbage til det kort eller den konto, du betalte med, og er normalt synlige inden for 5-10 bankdage.' },
  { id: 'svindel', label: 'Svindel – gode råd', text: 'Hej {navn}\n\nTak, fordi du sagde det til os. Betal aldrig uden om re:spin, og klik ikke på links, du får i beskeder. Vi spørger aldrig om adgangskoder eller kortoplysninger. Vi har kigget på brugeren og taget hånd om det.' },
  { id: 'afslut', label: 'Afslutning', text: '\n\nSkriv endelig igen her, hvis der er mere, vi kan hjælpe med.\n\nVenlig hilsen\n{mig}, re:spin' }
] as const;
