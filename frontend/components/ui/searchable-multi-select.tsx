'use client'

import * as React from 'react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command'

export interface MultiSelectOption {
  value: string
  label: string
  group?: string   // agrupa a lista (ex.: setor do cargo); um mesmo value pode aparecer em vários grupos
}

interface SearchableMultiSelectProps {
  values: string[]
  onValuesChange: (values: string[]) => void
  options: MultiSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  /** Texto do botão quando há seleção, ex.: n => `${n} cargos` */
  selectedText?: (count: number) => string
  disabled?: boolean
  className?: string
}

function normalizar(texto: string) {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export function SearchableMultiSelect({
  values,
  onValuesChange,
  options,
  placeholder = 'Selecione',
  searchPlaceholder = 'Buscar...',
  emptyText = 'Nenhum resultado.',
  selectedText = n => `${n} selecionado${n !== 1 ? 's' : ''}`,
  disabled,
  className,
}: SearchableMultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const grupos = React.useMemo(() => {
    const mapa = new Map<string, MultiSelectOption[]>()
    for (const option of options) {
      const grupo = option.group ?? ''
      if (!mapa.has(grupo)) mapa.set(grupo, [])
      mapa.get(grupo)!.push(option)
    }
    return [...mapa.entries()]
  }, [options])

  function toggle(value: string) {
    onValuesChange(values.includes(value) ? values.filter(v => v !== value) : [...values, value])
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild disabled={disabled}>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'border-input dark:bg-input/30 dark:hover:bg-input/50',
            'flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2',
            'text-sm whitespace-nowrap shadow-xs outline-none transition-[color,box-shadow]',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className,
          )}
        >
          <span className={cn('truncate', values.length === 0 && 'text-muted-foreground')}>
            {values.length === 0 ? placeholder : selectedText(values.length)}
          </span>
          <ChevronDown className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>
      {/* Sem Portal: dentro de um Dialog o portal impede a rolagem da lista */}
      <PopoverPrimitive.Content
        align="start"
        sideOffset={4}
        className={cn(
          'bg-popover text-popover-foreground z-50 rounded-md border shadow-md outline-hidden',
          'w-[var(--radix-popover-trigger-width)] min-w-64 p-0',
          'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        )}
      >
        <Command
          filter={(item, busca, keywords) =>
            normalizar([item, ...(keywords ?? [])].join(' ')).includes(normalizar(busca)) ? 1 : 0
          }
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className="max-h-72">
            <CommandEmpty>{emptyText}</CommandEmpty>
            {grupos.map(([grupo, itens]) => (
              <CommandGroup key={grupo || '__sem_grupo__'} heading={grupo || undefined}>
                {itens.map(option => {
                  const marcado = values.includes(option.value)
                  return (
                    <CommandItem
                      key={`${grupo}:${option.value}`}
                      // value precisa ser único na lista: o mesmo cargo pode aparecer em mais de um setor
                      value={`${option.label} · ${grupo}`}
                      keywords={grupo ? [grupo] : undefined}
                      onSelect={() => toggle(option.value)}
                    >
                      <div
                        className={cn(
                          'flex size-4 shrink-0 items-center justify-center rounded-[4px] border',
                          marcado ? 'bg-primary border-primary text-primary-foreground' : 'border-input',
                        )}
                      >
                        {marcado && <Check className="size-3" />}
                      </div>
                      <span className="truncate">{option.label}</span>
                    </CommandItem>
                  )
                })}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Root>
  )
}
