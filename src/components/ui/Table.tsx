import { cn } from '../../lib/utils'

// Table de shadcn/ui. Sin el `overflow-auto` del contenedor original: quien la use la mete
// en un `ScrollArea`, y dos zonas de desplazamiento anidadas se pelean por la rueda.

export function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div data-slot="table-container" className="relative w-full">
      <table data-slot="table" className={cn('w-full caption-bottom border-collapse', className)} {...props} />
    </div>
  )
}

export function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return <thead data-slot="table-header" className={cn('[&_tr]:border-b-4', className)} {...props} />
}

export function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return <tbody data-slot="table-body" className={cn('[&_tr:last-child]:border-0', className)} {...props} />
}

export function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return <tr data-slot="table-row" className={cn('border-b-2 border-brand-sombra/10', className)} {...props} />
}

export function TableHead({ className, ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      className={cn('px-4 text-left align-middle font-heading text-brand-gris whitespace-nowrap', className)}
      {...props}
    />
  )
}

export function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return <td data-slot="table-cell" className={cn('px-4 align-middle', className)} {...props} />
}
