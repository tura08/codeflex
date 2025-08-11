export function PreviewTable({ headers, rows }:{ headers:string[]; rows:any[][] }) {
  if (!headers.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>{headers.map((h,i)=>(<th key={i} className="border-b p-2 text-left whitespace-nowrap">{h}</th>))}</tr>
        </thead>
        <tbody>
          {rows.map((r,i)=>(
            <tr key={i}>
              {headers.map((_,j)=>(
                <td key={j} className="border-b p-2 whitespace-nowrap">{String(r[j] ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
