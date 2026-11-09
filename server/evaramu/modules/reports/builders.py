"""Turn report data (statements.py) into PDF documents (pdf.py)."""

from __future__ import annotations

from dataclasses import replace
from datetime import date
from decimal import Decimal

from evaramu.modules.reports.pdf import Column, Kpi, Report, Section, day, money, text

UNIT_LABEL = {"room": "Room", "house": "House", "apartment": "Apartment", "studio": "Studio", "commercial": "Shop room"}

_TYPE_CARDS = [{"key": "type_room", "label": "Rooms taken"}, {"key": "type_house", "label": "Houses taken"},
               {"key": "type_apartment", "label": "Apartments taken"}, {"key": "type_studio", "label": "Studios taken"},
               {"key": "type_commercial", "label": "Shop rooms taken"}]

#: What the user can switch on or off for each report (all on by default).
OPTIONS: dict[str, dict[str, list[dict[str, str]]]] = {
    "payments-received": {
        "cards": [{"key": "total_paid", "label": "Total amount paid"}, {"key": "payments", "label": "Number of payments"},
                  {"key": "tenants_paid", "label": "Tenants who paid"}, {"key": "months_paid", "label": "Rent months paid"},
                  {"key": "units_taken", "label": "Units taken"}, *_TYPE_CARDS],
        "sections": [{"key": "tenants", "label": "Table of tenants who paid"}],
    },
    "overdue": {
        "cards": [{"key": "total_overdue", "label": "Total overdue"}, {"key": "tenants_overdue", "label": "Tenants overdue"},
                  {"key": "months_overdue", "label": "Rent months overdue"}, {"key": "longest_delay", "label": "Longest delay"},
                  {"key": "units_taken", "label": "Units taken"}, *_TYPE_CARDS],
        "sections": [{"key": "tenants", "label": "Table of overdue tenants"}, {"key": "ageing", "label": "Overdue by age"}],
    },
    "occupancy": {
        "cards": [{"key": "units_taken", "label": "Units taken"}, {"key": "free_units", "label": "Free units"},
                  {"key": "expected_rent", "label": "Expected monthly rent"}, *_TYPE_CARDS],
        "sections": [{"key": "units", "label": "Table of all units"}],
    },
}


def choose(report: Report, cards: set[str] | None, sections: set[str] | None) -> Report:
    """Keep only the chosen cards and tables (None = everything)."""
    def keep(items, wanted):
        return list(items) if wanted is None else [i for i in items if i.key in wanted]

    return replace(report, kpis=keep(report.kpis, cards), secondary_kpis=keep(report.secondary_kpis, cards),
                   sections=keep(report.sections, sections))


def _amounts(totals: dict[str, Decimal]) -> str:
    """'1,250,000 RWF<br/>$950.00' — one line per currency, never added together."""
    return "<br/>".join(money(a, c) for c, a in totals.items()) or money(0, "RWF")


def _units_kpis(units: dict) -> list[Kpi]:
    kpis = [Kpi("Units taken", f"{units['taken']} of {units['total']}", f"{units['occupancy_rate']}% occupied · {units['free']} free",
                key="units_taken")]
    for t in units["by_type"][:5]:
        kpis.append(Kpi(f"{t['label']} taken", f"{t['taken']} / {t['total']}", f"{t['total'] - t['taken']} free",
                        key=f"type_{t['type']}"))
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
            months, text(", ".join(r["methods"])) or "—", day(r["last_payment"]), f"<b>{money(r['amount'], r['currency'])}</b>",
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
            Kpi("Total amount paid", _amounts(data["totals"]), "approved payments in the period", "green", "total_paid"),
            Kpi("Payments", str(data["payment_count"]), key="payments"),
            Kpi("Tenants who paid", str(data["tenant_count"]), key="tenants_paid"),
            Kpi("Rent months paid", str(data["months_paid"]), "fully paid months", key="months_paid"),
        ],
        secondary_kpis=_units_kpis(data["units"]),
        sections=[Section(
            title="Tenants who paid",
            columns=[Column("Tenant", 2.4), Column("Phone", 1.4), Column("Unit(s)", 1.5), Column("Payments", 0.9, "right"),
                     Column("Months paid", 1.1, "right"), Column("Payment method", 1.5), Column("Last payment", 1.1),
                     Column("Amount paid", 1.5, "right")],
            rows=rows, totals=totals, empty="No approved payments in this period.", key="tenants",
        )],
        notes=[
            "<b>Months paid</b>: rent months these payments fully settled; “part” means a month only partly paid.",
            "<b>Payment method</b>: how the tenant paid in this period, most-used first. Amounts are shown in the "
            "currency they were paid in; RWF and USD are never added together.",
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
            Kpi("Total overdue", _amounts(data["totals"]), "still owed after the due date", "red", "total_overdue"),
            Kpi("Tenants overdue", str(data["tenant_count"]), tone="red" if data["tenant_count"] else "green", key="tenants_overdue"),
            Kpi("Rent months overdue", str(data["months_overdue"]), key="months_overdue"),
            Kpi("Longest delay", f"{worst} days" if worst else "—", "since the oldest due date", key="longest_delay"),
        ],
        secondary_kpis=_units_kpis(data["units"]),
        sections=[
            Section(
                title="Tenants with overdue rent",
                columns=[Column("Tenant", 2.2), Column("Phone", 1.3), Column("Unit", 1.2), Column("Property", 2.0),
                         Column("Overdue", 1.2), Column("Oldest due", 1.0), Column("Days late", 0.8, "right"),
                         Column("Amount overdue", 1.5, "right")],
                rows=rows, totals=totals, empty="No overdue balances — every tenant is up to date.", key="tenants",
            ),
            Section(
                title="Overdue by age",
                columns=[Column("Currency", 1), Column("1–30 days", 1.5, "right"), Column("31–60 days", 1.5, "right"),
                         Column("61–90 days", 1.5, "right"), Column("Over 90 days", 1.5, "right"), Column("Total", 1.6, "right")],
                rows=ageing_rows, empty="Nothing overdue.", key="ageing",
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
            text(r["method"]) if r["taken"] and r["method"] else "—", balance,
        ])
    units = data["units"]
    return Report(
        title="Occupancy",
        subtitle=f"As of <b>{day(today)}</b> · {_scope(property_name, None)}",
        kpis=[
            Kpi("Units taken", f"{units['taken']} of {units['total']}", f"{units['occupancy_rate']}% occupied", "green", "units_taken"),
            Kpi("Free units", str(units["free"]), key="free_units"),
            Kpi("Expected monthly rent", _amounts(data["expected_rent"]), "from active agreements", key="expected_rent"),
        ],
        secondary_kpis=_units_kpis(units)[1:] or [],
        sections=[Section(
            title="All units",
            columns=[Column("Property", 1.9), Column("Unit", 1.2), Column("Type", 0.9), Column("Status", 1.1),
                     Column("Tenant", 2.0), Column("Phone", 1.3), Column("Monthly rent", 1.3, "right"),
                     Column("Payment method", 1.3), Column("Balance", 1.3, "right")],
            rows=rows, empty="No units yet.", key="units",
        )],
        notes=["<b>Taken</b>: occupied or under an active agreement. <b>Payment method</b>: how the tenant paid "
               "their latest approved payment. <b>Balance</b>: unpaid amount on open invoices."],
    )
