export type OrderStatus = 'NEW' | 'PICKING' | 'SHIPPED' | 'CANCELLED';

export type Order = {
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  total: number;
  date: string;
};

export function generateOrders(count: number): Order[] {
  const statuses: OrderStatus[] = ['NEW', 'PICKING', 'SHIPPED', 'CANCELLED'];

  return Array.from({ length: count }, (_, i) => ({
    orderNumber: `ORD-${String(i + 1).padStart(5, '0')}`,
    customerName: `Customer ${i + 1}`,
    status: statuses[i % statuses.length],
    total: Number((Math.random() * 10000 + 100).toFixed(2)),
    date: new Date(
      Date.now() - Math.floor(Math.random() * 365) * 86_400_000
    ).toISOString(),
  }));
}

export const orders = generateOrders(5000);
