export function TwoCol({ children }: { children: [React.ReactNode, React.ReactNode] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>{children[0]}</div>
      <div>{children[1]}</div>
    </div>
  );
}

export function FiveCol({ children }: { children: React.ReactNode }) {
  return <div className="contents">{children}</div>;
}
