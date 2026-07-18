/** Lightweight Tabler-outline style icons (avoids loading the full @tabler barrel). */

function IconBase({ size = 18, stroke = 1.75, className, children, ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** ti-edit */
export function IconEdit(props) {
  return (
    <IconBase {...props}>
      <path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1" />
      <path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z" />
      <path d="M16 5l3 3" />
    </IconBase>
  );
}

/** ti-trash */
export function IconTrash(props) {
  return (
    <IconBase {...props}>
      <path d="M4 7l16 0" />
      <path d="M10 11l0 6" />
      <path d="M14 11l0 6" />
      <path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12" />
      <path d="M9 7v-3a1 1 0 0 1 1 -1h4a1 1 0 0 1 1 1v3" />
    </IconBase>
  );
}

/** ti-check */
export function IconCheck(props) {
  return (
    <IconBase {...props}>
      <path d="M5 12l5 5l10 -10" />
    </IconBase>
  );
}

/** ti-checks */
export function IconChecks(props) {
  return (
    <IconBase {...props}>
      <path d="M7 12l5 5l10 -10" />
      <path d="M2 12l5 5m5 -5l5 -5" />
    </IconBase>
  );
}

/** ti-search */
export function IconSearch(props) {
  return (
    <IconBase {...props}>
      <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
      <path d="M21 21l-6 -6" />
    </IconBase>
  );
}

/** ti-dots-vertical */
export function IconDotsVertical(props) {
  return (
    <IconBase {...props}>
      <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M12 19m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
      <path d="M12 5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    </IconBase>
  );
}

/** ti-plus */
export function IconPlus(props) {
  return (
    <IconBase {...props}>
      <path d="M12 5l0 14" />
      <path d="M5 12l14 0" />
    </IconBase>
  );
}

/** ti-receipt */
export function IconReceipt(props) {
  return (
    <IconBase {...props}>
      <path d="M5 21v-16a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v16l-3 -2l-2 2l-2 -2l-2 2l-2 -2l-3 2" />
      <path d="M14 8h-2.5a1.5 1.5 0 0 0 0 3h1a1.5 1.5 0 0 1 0 3h-2.5" />
      <path d="M12 7v-1m0 12v-1" />
    </IconBase>
  );
}
