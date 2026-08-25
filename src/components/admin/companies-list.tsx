import Link from "next/link";
import { ArrowRight, Building2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { CompanyListResult } from "@/modules/companies/company-service";

function dateLabel(value: string) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Not recorded"
    : new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function queryPath(result: CompanyListResult, page: number) {
  const params = new URLSearchParams();
  if (result.search) params.set("q", result.search);
  params.set("page", String(page));
  params.set("sort", result.sort);
  params.set("direction", result.direction);
  params.set("pageSize", String(result.pageSize));
  return `/admin/companies?${params.toString()}`;
}

export function CompaniesList({ result }: { result: CompanyListResult }) {
  const firstItem = result.total ? (result.page - 1) * result.pageSize + 1 : 0;
  const lastItem = Math.min(result.page * result.pageSize, result.total);

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">Companies module</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Company accounts</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Read-only visibility into company packages, assessments, manager dashboard readiness, and remaining credits.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Total companies</p>
          <p className="mt-1 text-2xl font-black text-slate-950">{result.total.toLocaleString("en")}</p>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <form method="get" className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_160px_auto]" role="search">
            <label className="relative block">
              <span className="sr-only">Search company name, assessment, or manager contact</span>
              <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
              <Input name="q" defaultValue={result.search} placeholder="Search company, assessment, or manager" className="h-11 ps-10" />
            </label>
            <label>
              <span className="sr-only">Sort companies</span>
              <select name="sort" defaultValue={result.sort} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="created">Created date</option>
                <option value="name">Company name</option>
                <option value="package">Package size</option>
                <option value="credits">Credits remaining</option>
              </select>
            </label>
            <label>
              <span className="sr-only">Sort direction</span>
              <select name="direction" defaultValue={result.direction} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>
            <input type="hidden" name="pageSize" value={result.pageSize} />
            <Button type="submit" className="h-11 bg-slate-950 hover:bg-slate-800">Apply</Button>
          </form>
        </CardContent>
      </Card>

      {result.companies.length ? (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Company Name</TableHead>
                  <TableHead>Assessment</TableHead>
                  <TableHead className="text-right">Package Size</TableHead>
                  <TableHead className="text-right">Credits Remaining</TableHead>
                  <TableHead className="text-right">Credits Used</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead>Manager Dashboard</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {result.companies.map((company) => (
                  <TableRow key={company.id} className="align-middle">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Building2 className="h-4 w-4" aria-hidden="true" /></span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-950">{company.name}</p>
                          <p className="truncate text-xs text-slate-500">{company.managerContact}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[220px] text-sm text-slate-600">{company.assessment}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{company.packageSize}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{company.creditsRemaining}</TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">{company.creditsUsed}</TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-slate-600">{dateLabel(company.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={company.managerDashboardEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-600"}>
                        {company.managerDashboardEnabled ? "Active" : "Not configured"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm" className="gap-2">
                        <Link href={`/admin/companies/${company.id}`}>View <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 md:hidden">
            {result.companies.map((company) => (
              <Card key={company.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div><h2 className="font-black text-slate-950">{company.name}</h2><p className="mt-1 text-xs text-slate-500">{company.managerContact}</p></div>
                    <Badge variant="outline" className={company.managerDashboardEnabled ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "bg-slate-50 text-slate-600"}>{company.managerDashboardEnabled ? "Dashboard active" : "No dashboard"}</Badge>
                  </div>
                  <p className="mt-4 text-sm text-slate-600">{company.assessment}</p>
                  <dl className="mt-4 grid grid-cols-3 gap-3 border-y border-slate-100 py-4 text-center">
                    <div><dt className="text-[11px] uppercase text-slate-500">Package</dt><dd className="mt-1 font-black tabular-nums">{company.packageSize}</dd></div>
                    <div><dt className="text-[11px] uppercase text-slate-500">Remaining</dt><dd className="mt-1 font-black tabular-nums">{company.creditsRemaining}</dd></div>
                    <div><dt className="text-[11px] uppercase text-slate-500">Used</dt><dd className="mt-1 font-black tabular-nums">{company.creditsUsed}</dd></div>
                  </dl>
                  <div className="mt-4 flex items-center justify-between gap-3"><span className="text-xs text-slate-500">Created {dateLabel(company.createdAt)}</span><Button asChild size="sm" className="bg-slate-950"><Link href={`/admin/companies/${company.id}`}>View company</Link></Button></div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <Card className="border-dashed border-slate-300 bg-white"><CardContent className="flex min-h-64 flex-col items-center justify-center p-8 text-center"><Building2 className="h-10 w-10 text-slate-300" aria-hidden="true" /><h2 className="mt-4 text-lg font-black text-slate-950">No companies found</h2><p className="mt-2 max-w-md text-sm text-slate-500">Try a different company name, assessment, or manager contact.</p></CardContent></Card>
      )}

      <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 sm:flex-row">
        <p className="text-sm text-slate-600">Showing <span className="font-bold text-slate-950">{firstItem}–{lastItem}</span> of <span className="font-bold text-slate-950">{result.total}</span></p>
        <div className="flex items-center gap-2">
          {result.page > 1 ? <Button asChild variant="outline" size="sm"><Link href={queryPath(result, result.page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /> Previous</Link></Button> : <Button variant="outline" size="sm" disabled><ChevronLeft className="h-4 w-4" /> Previous</Button>}
          <span className="px-2 text-sm font-semibold text-slate-700">Page {result.page} of {result.totalPages}</span>
          {result.page < result.totalPages ? <Button asChild variant="outline" size="sm"><Link href={queryPath(result, result.page + 1)} aria-label="Next page">Next <ChevronRight className="h-4 w-4" /></Link></Button> : <Button variant="outline" size="sm" disabled>Next <ChevronRight className="h-4 w-4" /></Button>}
        </div>
      </div>
    </div>
  );
}

