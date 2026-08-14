import { memo } from 'react';
import type { Order } from './data/orders';

type OrderRowProps = {
  order: Order;
  selected: boolean;
  tabIndex: number;
  onClick: (orderId: string) => void;
  onKeyDown: (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    orderId: string
  ) => void;
  registerRef: (element: HTMLTableRowElement | null) => void;
};

export const OrderRow = memo(function OrderRow({
  order,
  selected,
  tabIndex,
  onClick,
  onKeyDown,
  registerRef,
}: OrderRowProps) {
  return (
    <tr
      ref={registerRef}
      tabIndex={tabIndex}
      onClick={() => onClick(order.orderNumber)}
      onKeyDown={(event) => onKeyDown(event, order.orderNumber)}
      aria-selected={selected}
      className={selected ? 'selected' : ''}
    >
      <td>{order.orderNumber}</td>
      <td>{order.customerName}</td>
      <td>{order.status}</td>
      <td>{order.total.toFixed(2)}</td>
      <td>{new Date(order.date).toLocaleDateString()}</td>
    </tr>
  );
});
