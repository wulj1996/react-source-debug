import * as React from 'react';

export default function HeavyList() {
  const items = Array.from({ length: 100 }, (_, i) => `item-${i}`);
  return (
    <div className="card">
      <h2>Suspense + lazy 调试</h2>
      <ul>
        {items.map(item => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
