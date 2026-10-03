import { cn } from '../../lib/utils'

// Primitivas de shadcn/ui copiadas a mano (el repo no usa su CLI) y vestidas con la marca:
// borde grueso de `brand-sombra` y sombra dura, como `.paper-card`.

export function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card"
      className={cn('bg-white text-brand-sombra border-4 border-brand-sombra rounded-3xl shadow-sticker flex flex-col', className)}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-header" className={cn('flex flex-col gap-1.5 p-6', className)} {...props} />
}

export function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-title" className={cn('font-heading leading-none', className)} {...props} />
}

export function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-description" className={cn('font-body text-sm text-brand-gris', className)} {...props} />
}

export function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('p-6 pt-0', className)} {...props} />
}
