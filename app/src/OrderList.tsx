import { useRef, useState } from 'react';
import { orders } from './data/orders';
import type { OrderStatus } from './data/orders';
import { useUrlState } from './useUrlState';

const statuses: OrderStatus[] = ['NEW', 'PICKING', 'SHIPPED', 'CANCELLED'];

export function OrderList() {
  const [search, setSearch] = useUrlState('search');
  const [statusParam, setStatusParam] = useUrlState('status');

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());

  const selectedStatuses = statusParam
    ? (statusParam.split(',').filter(Boolean) as OrderStatus[])
    : [];

  const toggleStatus = (status: OrderStatus) => {
    const next = selectedStatuses.includes(status)
      ? selectedStatuses.filter((item) => item !== status)
      : [...selectedStatuses, status];

    setStatusParam(next.join(','));
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = order.orderNumber
      .toLowerCase()
      .includes(search.toLowerCase());

    const matchesStatus =
      selectedStatuses.length === 0 || selectedStatuses.includes(order.status);

    return matchesSearch && matchesStatus;
  });

  const validSelectedOrderId = filteredOrders.some(
    (order) => order.orderNumber === selectedOrderId
  )
    ? selectedOrderId
    : null;

  const openOrder = orders.find((order) => order.orderNumber === openOrderId);

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLTableRowElement>,
    orderId: string
  ) => {
    const index = filteredOrders.findIndex(
      (order) => order.orderNumber === orderId
    );

    if (event.key === 'ArrowDown' && index < filteredOrders.length - 1) {
      event.preventDefault();
      const nextId = filteredOrders[index + 1].orderNumber;
      setSelectedOrderId(nextId);
      rowRefs.current.get(nextId)?.focus();
    }

    if (event.key === 'ArrowUp' && index > 0) {
      event.preventDefault();
      const previousId = filteredOrders[index - 1].orderNumber;
      setSelectedOrderId(previousId);
      rowRefs.current.get(previousId)?.focus();
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      setSelectedOrderId(orderId);
      setOpenOrderId(orderId);
    }

    if (event.key === 'Escape' && openOrderId) {
      event.preventDefault();
      const previousId = openOrderId;
      setOpenOrderId(null);
      setSelectedOrderId(previousId);

      requestAnimationFrame(() => {
        rowRefs.current.get(previousId)?.focus();
      });
    }
  };

  return (
    <div>
      <input
        type="search"
        placeholder="Search order number..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div>
        {statuses.map((status) => (
          <label key={status}>
            <input
              type="checkbox"
              checked={selectedStatuses.includes(status)}
              onChange={() => toggleStatus(status)}
            />
            {status}
          </label>
        ))}
      </div>

      <table>
        <thead>
          <tr>
            <th>Order Number</th>
            <th>Customer</th>
            <th>Status</th>
            <th>Total</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {filteredOrders.map((order, index) => {
            const isSelected = validSelectedOrderId === order.orderNumber;
            const isFirstRow = !validSelectedOrderId && index === 0;

            return (
              <tr
                key={order.orderNumber}
                ref={(element) => {
                  if (element) rowRefs.current.set(order.orderNumber, element);
                  else rowRefs.current.delete(order.orderNumber);
                }}
                tabIndex={isSelected || isFirstRow ? 0 : -1}
                onClick={() => {
                  setSelectedOrderId(order.orderNumber);
                  setOpenOrderId(order.orderNumber);
                }}
                onKeyDown={(event) => handleKeyDown(event, order.orderNumber)}
                className={isSelected ? 'selected' : ''}
              >
                <td>{order.orderNumber}</td>
                <td>{order.customerName}</td>
                <td>{order.status}</td>
                <td>{order.total.toFixed(2)}</td>
                <td>{new Date(order.date).toLocaleDateString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {openOrder && (
        <aside>
          <h2>{openOrder.orderNumber}</h2>
          <p>Customer: {openOrder.customerName}</p>
          <p>Status: {openOrder.status}</p>
          <p>Total: {openOrder.total.toFixed(2)}</p>
          <p>Date: {new Date(openOrder.date).toLocaleDateString()}</p>
          <button onClick={() => setOpenOrderId(null)}>Close</button>
        </aside>
      )}
    </div>
  );
}
