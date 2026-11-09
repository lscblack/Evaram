"""Turn report data (statements.py) into PDF documents (pdf.py)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from evaramu.modules.reports.pdf import Column, Kpi, Report, Section, day, money, month, text

UNIT_LABEL = {"room": "Room", "house": "House", "apartment": "Apartment", "studio": "Studio", "commercial": "Shop room"}


def _amounts(totals: dict[str, Decimal]) -> str:
    """'1,250,000 RWF<br/>$950.00' — one line per currency, never added together."""
    return "<br/>".join(money(a, c) for c, a in totals.items()) or money(0, "RWF")


def _units_kpis(units: dict) -> list[Kpi]:
    kpis = [Kpi("Units taken", f"{units['taken']} of {units['total']}", f"{units['occupancy_rate']}% occupied · {units['free']} free")]
    for t in units["by_type"][:5]:
        kpis.append(Kpi(f"{t['label']} taken", f"{t['taken']} / {t['total']}", f"{t['total'] - t['taken']} free"))
    return kpis


def _period(date_from: date | None, date_to: date | None) -> str:
    if date_from and date_to:
        return f"{day(date_from)} – {day(date_to)}"
    if date_from:
        return f"From {day(date_from)}"
    if date_to:
        return f"Up to {day(date_to)}"
    return "All time"


def _scope(property_name: str | None, currency: str | None) -> str:
    bits = [f"Property: {text(property_name)}" if property_name else "All properties"]
    if currency:
        bits.append(f"Currency: {currency}")
    return " · ".join(bits)


def payments_received(data: dict, *, date_from: date | None, date_to: date | None,
                      property_name: str | None, currency: str | None) -> Report:
    rows = []
    for r in data["rows"]:
        months = str(r["months_full"]) + (f" + {r['months_part']} part" if r["months_part"] else "")
        rows.append([
            f"<b>{text(r['tenant'])}</b>", text(r["phone"]), text(", ".join(r["units"])), str(r["payments"]),
            months, month(r["paid_through"]), day(r["last_payment"]), f"<b>{money(r['amount'], r['currency'])}</b>",
        ])
    totals = []
    for c, a in data["totals"].items():
        mine = [r for r in data["rows"] if r["currency"] == c]
        totals.append([f"Total {c}", "", "", str(sum(r["payments"] for r in mine)),
                       str(sum(r["months_full"] for r in mine)), "", "", money(a, c)])
    return Report(
        title="Payments received",
        subtitle=f"Period: <b>{_period(date_from, date_to)}</b> · {_scope(property_name, currency)} · approved payments only",
        kpis=[
            Kpi("Total amount paid", _amounts(data["totals"]), "approved payments in the period", "green"),
            Kpi("Payments", str(data["payment_count"])),
            Kpi("Tenants who paid", str(data["tenant_count"])),
            Kpi("Rent months paid", str(data["months_paid"]), "fully paid months"),
        ],
        secondary_kpis=_units_kpis(data["units"]),
        sections=[Section(
            title="Tenants who paid",
            columns=[Column("Tenant", 2.4), Column("Phone", 1.4), Column("Unit(s)", 1.5), Column("Payments", 0.9, "right"),
                     Column("Months paid", 1.1, "right"), Column("Paid through", 1.1), Column("Last payment", 1.1),
                     Column("Amount paid", 1.5, "right")],
            rows=rows, totals=totals, empty="No approved payments in this period.",
        )],
        notes=[
            "<b>Months paid</b>: rent months these payments fully settled; “part” means a month only partly paid.",
            "<b>Paid through</b>: the latest rent month the tenant has fully paid. Amounts are shown in the currency "
            "they were paid in; RWF and USD are never added together.",
        ],
    )


def overdue_tenants(data: dict, *, today: date, property_name: str | None, currency: str | None) -> Report:
    rows = []
    for r in data["rows"]:
        what = f"{r['months']} month{'s' if r['months'] != 1 else ''}" + (f" + {r['other']} charge{'s' if r['other'] != 1 else ''}" if r["other"] else "")
        rows.append([
            f"<b>{text(r['tenant'])}</b>", text(r["phone"]), text(r["unit"]), text(r["property"]), what,
            day(r["oldest_due"]), f"<font color='#b42318'><b>{r['days_late']}</b></font>",
            f"<b>{money(r['amount'], r['currency'])}</b>",
        ])
    totals = []
    for c, a in data["totals"].items():
        n = sum(r["months"] for r in data["rows"] if r["currency"] == c)
        totals.append([f"Total {c}", "", "", "", f"{n} month{'s' if n != 1 else ''}", "", "", money(a, c)])
    ageing_rows = [[c, *(money(b[k], c) for k in ("1-30", "31-60", "61-90", "90+")), f"<b>{money(sum(b.values()), c)}</b>"]
                   for c, b in data["ageing"].items()]
    worst = max((r["days_late"] for r in data["rows"]), default=0)
    return Report(
        title="Overdue tenants",
        subtitle=f"As of <b>{day(today)}</b> · {_scope(property_name, currency)} · unpaid invoices past their due date",
        kpis=[
            Kpi("Total overdue", _amounts(data["totals"]), "still owed after the due date", "red"),
            Kpi("Tenants overdue", str(data["tenant_count"]), tone="red" if data["tenant_count"] else "green"),
            Kpi("Rent months overdue", str(data["months_overdue"])),
            Kpi("Longest delay", f"{worst} days" if worst else "—", "since the oldest due date"),
        ],
        secondary_kpis=_units_kpis(data["units"]),
        sections=[
            Section(
                title="Tenants with overdue rent",
                columns=[Column("Tenant", 2.2), Column("Phone", 1.3), Column("Unit", 1.2), Column("Property", 2.0),
                         Column("Overdue", 1.2), Column("Oldest due", 1.0), Column("Days late", 0.8, "right"),
                         Column("Amount overdue", 1.5, "right")],
                rows=rows, totals=totals, empty="No overdue balances — every tenant is up to date.",
            ),
            Section(
                title="Overdue by age",
                columns=[Column("Currency", 1), Column("1–30 days", 1.5, "right"), Column("31–60 days", 1.5, "right"),
                         Column("61–90 days", 1.5, "right"), Column("Over 90 days", 1.5, "right"), Column("Total", 1.6, "right")],
                rows=ageing_rows, empty="Nothing overdue.",
            ),
        ],
        notes=["<b>Days late</b> counts from the oldest unpaid due date. Partly paid invoices show only the remaining balance."],
    )


def occupancy(data: dict, *, today: date, property_name: str | None) -> Report:
    rows = []
    for r in data["rows"]:
        status = (f"<font color='#067647'><b>{r['status']}</b></font>" if r["taken"] else text(r["status"]))
        balance = money(r["balance"], r["currency"]) if r["taken"] else "—"
        if r["taken"] and r["balance"] > 0:
            balance = f"<font color='#b42318'><b>{balance}</b></font>"
        rows.append([
            text(r["property"]), f"<b>{text(r['unit'])}</b>", UNIT_LABEL.get(r["type"], text(r["type"])), status,
            text(r["tenant"]) or "—", text(r["phone"]) or "—", money(r["rent"], r["currency"]),
            month(r["paid_through"]) if r["taken"] else "—", balance,
        ])
    units = data["units"]
    return Report(
        title="Occupancy",
        subtitle=f"As of <b>{day(today)}</b> · {_scope(property_name, None)}",
        kpis=[
            Kpi("Units taken", f"{units['taken']} of {units['total']}", f"{units['occupancy_rate']}% occupied", "green"),
            Kpi("Free units", str(units["free"])),
            Kpi("Expected monthly rent", _amounts(data["expected_rent"]), "from active agreements"),
        ],
        secondary_kpis=_units_kpis(units)[1:] or [],
        sections=[Section(
            title="All units",
            columns=[Column("Property", 1.9), Column("Unit", 1.2), Column("Type", 0.9), Column("Status", 1.1),
                     Column("Tenant", 2.0), Column("Phone", 1.3), Column("Monthly rent", 1.3, "right"),
                     Column("Paid through", 1.1), Column("Balance", 1.3, "right")],
            rows=rows, empty="No units yet.",
        )],
        notes=["<b>Taken</b>: occupied or under an active agreement. <b>Balance</b>: unpaid amount on open invoices."],
    )
