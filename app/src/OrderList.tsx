import { useCallback, useMemo, useRef, useState } from 'react';
import { orders } from './data/orders';
import type { OrderStatus } from './data/orders';
import { useUrlState } from './useUrlState';
import { OrderRow } from './OrderRow';

const statuses: OrderStatus[] = ['NEW', 'PICKING', 'SHIPPED', 'CANCELLED'];

export function OrderList() {
  const [search, setSearch] = useUrlState('search');
  const [statusParam, setStatusParam] = useUrlState('status');

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);

  const rowRefs = useRef<Map<string, HTMLTableRowElement>>(new Map());
  const registerRefCache = useRef<
    Map<string, (element: HTMLTableRowElement | null) => void>
  >(new Map());

  const getRegisterRef = (orderId: string) => {
    if (!registerRefCache.current.has(orderId)) {
      registerRefCache.current.set(orderId, (element) => {
        if (element) rowRefs.current.set(orderId, element);
        else rowRefs.current.delete(orderId);
      });
    }
    return registerRefCache.current.get(orderId)!;
  };

  const toggleStatus = (status: OrderStatus) => {
    const current = statusParam ? statusParam.split(',').filter(Boolean) : [];
    const next = current.includes(status)
      ? current.filter((item) => item !== status)
      : [...current, status];

    setStatusParam(next.join(','));
  };

  const selectedStatuses = useMemo(
    () => (statusParam ? (statusParam.split(',').filter(Boolean) as OrderStatus[]) : []),
    [statusParam]
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = order.orderNumber
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesStatus =
        selectedStatuses.length === 0 || selectedStatuses.includes(order.status);

      return matchesSearch && matchesStatus;
    });
  }, [search, selectedStatuses]);

  const validSelectedOrderId = filteredOrders.some(
    (order) => order.orderNumber === selectedOrderId
  )
    ? selectedOrderId
    : null;

  const openOrder = orders.find((order) => order.orderNumber === openOrderId);

  const handleRowClick = useCallback((orderId: string) => {
    setSelectedOrderId(orderId);
    setOpenOrderId(orderId);
  }, []);

  const filteredOrdersRef = useRef(filteredOrders);
  filteredOrdersRef.current = filteredOrders;

  const openOrderIdRef = useRef(openOrderId);
  openOrderIdRef.current = openOrderId;

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTableRowElement>, orderId: string) => {
      const currentFilteredOrders = filteredOrdersRef.current;
      const currentOpenOrderId = openOrderIdRef.current;

      const index = currentFilteredOrders.findIndex(
        (order) => order.orderNumber === orderId
      );

      if (event.key === 'ArrowDown' && index < currentFilteredOrders.length - 1) {
        event.preventDefault();
        const nextId = currentFilteredOrders[index + 1].orderNumber;
        setSelectedOrderId(nextId);
        rowRefs.current.get(nextId)?.focus();
      }

      if (event.key === 'ArrowUp' && index > 0) {
        event.preventDefault();
        const previousId = currentFilteredOrders[index - 1].orderNumber;
        setSelectedOrderId(previousId);
        rowRefs.current.get(previousId)?.focus();
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        setSelectedOrderId(orderId);
        setOpenOrderId(orderId);
      }

      if (event.key === 'Escape' && currentOpenOrderId) {
        event.preventDefault();
        const previousId = currentOpenOrderId;
        setOpenOrderId(null);
        setSelectedOrderId(previousId);

        requestAnimationFrame(() => {
          rowRefs.current.get(previousId)?.focus();
        });
      }
    },
    []
  );

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
              <OrderRow
                key={order.orderNumber}
                order={order}
                selected={isSelected}
                tabIndex={isSelected || isFirstRow ? 0 : -1}
                onClick={handleRowClick}
                onKeyDown={handleKeyDown}
                registerRef={getRegisterRef(order.orderNumber)}
              />
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
