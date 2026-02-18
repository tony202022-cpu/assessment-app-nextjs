export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function Page({
  params,
  searchParams,
}: {
  params: { attemptId: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  return (
    <div style={{ padding: 24, fontFamily: "system-ui" }}>
      <h1>ROUTE OK</h1>
      <div>attemptId: {params.attemptId}</div>
      <pre>{JSON.stringify(searchParams, null, 2)}</pre>
    </div>
  );
}
