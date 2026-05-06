export const formatPrice = (price: number | undefined | null): string => {
  if (price === undefined || price === null) return 'R$ 0,00';
  return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

export const formatTimeInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}:${digits.slice(2)}`;
};
