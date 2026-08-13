Pre-Screening Assessment - Front-End Engineering

Position applied for: Senior Front-End Developer

Section 1 - Code

Q1

The developer's explanation is wrong because React.memo does not perform a deep comparison of props, it uses a shallow comparison, checking whether each prop has the same reference. Wrapping columns in useMemo works because it keeps the same array reference between renders unless its dependencies change.

However this fix alone will not work if other props still receive new references on every render. Two examples are inline functions such as onEdit={() => handleEdit(product)} and onDelete={() => handleDelete(product)}.

The actual cause of the re-render is changing prop identities between renders, while the performance cost comes from having to re-render every row in the table.

Q2

In progress.
