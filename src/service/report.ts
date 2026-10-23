import type { ReportAction, ReportDecision } from '@/lib/report'
import { ConflictException, NotFoundException } from '@/lib/server/http-exception'
import type { Prisma } from '@/prisma/generated/prisma/client'
import { ReportAction as ReportActionEnum, ReportStatus } from '@/prisma/generated/prisma/enums'
import { prisma } from '@/prisma/prisma'

/**
 * Content reports: a respondent flagging a research, and an admin's decision on it.
 *
 * A report is one row per flag, written by the reporter (`createReportService`) and decided
 * later by an admin (`reviewReportService`). The row carries no `reviewedAt` of its own —
 * the decision is the last write, so `updatedAt` is when it was made, the same convention
 * `quality-check.ts` uses.
 *
 * Deciding a report does not itself remove content or suspend a research: `actionTaken`
 * records what an admin did, and the enforcement stays a separate, deliberate step.
 */

/* ========== Konstanta ========== */

/** How many reports the admin queue returns. */
const DEFAULT_REPORT_LIMIT = 50

/** The states a report is still awaiting a decision in. */
const OPEN_STATUSES: ReportStatus[] = [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW]

/* ========== Bentuk baca ========== */

/** What a report row needs: the research it is about, and who filed it. */
const REPORT_INCLUDE = {
    research: {
        select: {
            id: true,
            title: true,
            researcher: { select: { name: true } },
        },
    },
    reporter: { select: { id: true, name: true } },
} satisfies Prisma.ContentReportInclude

type ReportRow = Prisma.ContentReportGetPayload<{ include: typeof REPORT_INCLUDE }>

/* ========== Helper ========== */

/** Public view of a report, without the soft-delete bookkeeping. */
function toReportResponse(report: ReportRow) {
    return {
        id: report.id,
        researchId: report.researchId,
        reportedBy: report.reportedBy,
        reason: report.reason,
        status: report.status,
        actionTaken: report.actionTaken,
        reviewedBy: report.reviewedBy,
        createdAt: report.createdAt,
        // The row has no `reviewedAt`; the decision is the last write, so this is when it
        // was made.
        updatedAt: report.updatedAt,
        research: {
            id: report.research.id,
            title: report.research.title,
            researcherName: report.research.researcher.name,
        },
        reporter: { id: report.reporter.id, name: report.reporter.name },
    }
}

/** Reads one report, or throws a 404. */
async function findReport(id: string) {
    const report = await prisma.contentReport.findFirst({
        where: { id, deletedAt: null },
        include: REPORT_INCLUDE,
    })

    if (report === null) throw new NotFoundException('Report not found')

    return report
}

/* ========== Tulis ========== */

/**
 * Files a report against a research.
 *
 * The research has to exist and not be archived, so a report can never point at nothing.
 * One reporter may only have a single report open on a research at a time — a second one
 * while the first is still awaiting a decision is refused rather than piled on, which keeps
 * the admin queue readable.
 */
export async function createReportService({
    researchId,
    reportedBy,
    reason,
}: {
    researchId: string
    reportedBy: string
    reason: string
}) {
    const research = await prisma.research.findFirst({
        where: { id: researchId, deletedAt: null },
        select: { id: true },
    })

    if (research === null) throw new NotFoundException('Research not found')

    const existing = await prisma.contentReport.findFirst({
        where: { researchId, reportedBy, deletedAt: null, status: { in: OPEN_STATUSES } },
        select: { id: true },
    })

    if (existing !== null) {
        throw new ConflictException('You already have an open report on this research')
    }

    const report = await prisma.contentReport.create({
        data: { researchId, reportedBy, reason },
        include: REPORT_INCLUDE,
    })

    return toReportResponse(report)
}

/* ========== Baca ========== */

/** Lists reports for the admin queue, most recently filed first. */
export async function listReportsService({
    status,
    take,
}: {
    status?: ReportStatus
    take?: number
}) {
    const reports = await prisma.contentReport.findMany({
        where: { deletedAt: null, ...(status === undefined ? {} : { status }) },
        orderBy: { createdAt: 'desc' },
        take: take ?? DEFAULT_REPORT_LIMIT,
        include: REPORT_INCLUDE,
    })

    return reports.map(toReportResponse)
}

/** One report, with the research and reporter it is about. */
export async function getReportService({ id }: { id: string }) {
    return toReportResponse(await findReport(id))
}

/* ========== Tinjau ========== */

/**
 * Decides a report.
 *
 * A report is decided once: anything already `RESOLVED` or `DISMISSED` is refused rather
 * than overwritten, so the first decision is the one that stands. `actionTaken` records
 * what was done and defaults to `NONE`, because most decisions are "nothing to act on".
 */
export async function reviewReportService({
    id,
    reviewerId,
    status,
    actionTaken,
}: {
    id: string
    reviewerId: string
    status: ReportDecision
    actionTaken?: ReportAction
}) {
    const result = await prisma.contentReport.updateMany({
        where: { id, deletedAt: null, status: { in: OPEN_STATUSES } },
        data: { status, reviewedBy: reviewerId, actionTaken: actionTaken ?? ReportActionEnum.NONE },
    })

    if (result.count === 0) {
        const report = await prisma.contentReport.findFirst({
            where: { id, deletedAt: null },
            select: { status: true },
        })

        if (report === null) throw new NotFoundException('Report not found')

        throw new ConflictException(`This report is ${report.status} and has already been decided`)
    }

    return toReportResponse(await findReport(id))
}
