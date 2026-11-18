import * as React from 'react';
import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useCallback,
  useReducer,
  useRef,
  useContext,
  useDeferredValue,
  useTransition,
  lazy,
  Suspense,
} from 'react';

const ThemeContext = React.createContext('light');

const HeavyList = lazy(() => import('./HeavyList'));

function reducer(state, action) {
  switch (action.type) {
    case 'increment':
      return { count: state.count + 1 };
    case 'decrement':
      return { count: state.count - 1 };
    default:
      return state;
  }
}

function Counter() {
  const [count, setCount] = useState(0);
  const [state, dispatch] = useReducer(reducer, { count: 0 });
  const ref = useRef(0);
  const theme = useContext(ThemeContext);

  useLayoutEffect(() => {
    console.log('[useLayoutEffect] commit 阶段同步执行');
  }, []);

  useEffect(() => {
    console.log('[useEffect] passive effect 异步执行, count =', count);
    return () => console.log('[useEffect] cleanup, count =', count);
  }, [count]);

  const doubled = useMemo(() => count * 2, [count]);
  const handleClick = useCallback(() => setCount(c => c + 1), []);

  return (
    <div className="card">
      <h2>Hooks 调试</h2>
      <p>theme: {theme}</p>
      <p>count: {count}</p>
      <p>doubled (useMemo): {doubled}</p>
      <p>reducer count: {state.count}</p>
      <p>ref value: {ref.current}</p>
      <button onClick={handleClick}>setCount + 1</button>
      <button onClick={() => dispatch({ type: 'increment' })}>
        reducer + 1
      </button>
      <button onClick={() => (ref.current += 1)}>ref + 1 (不触发渲染)</button>
    </div>
  );
}

function SearchBox() {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  return (
    <div className="card">
      <h2>并发特性调试</h2>
      <input
        value={query}
        onChange={e => {
          setQuery(e.target.value);
          startTransition(() => setQuery(e.target.value));
        }}
        placeholder="输入触发 useTransition / useDeferredValue"
      />
      <p>isPending: {String(isPending)}</p>
      <p>deferredQuery: {deferredQuery}</p>
    </div>
  );
}

export default function App() {
  return (
    <div className="app">
      <h1>React 18.2.0 源码调试</h1>
      <ThemeContext.Provider value="dark">
        <Counter />
      </ThemeContext.Provider>
      <SearchBox />
      <Suspense fallback={<div>loading HeavyList...</div>}>
        <HeavyList />
      </Suspense>
    </div>
  );
}
