import { IClaimRepository } from "../../domain/repositories/IClaimRepository";
import { IInvestigationRepository } from "../../domain/repositories/IInvestigationRepository";
import { IFraudRepository } from "../../domain/repositories/IFraudRepository";
import { IAgentEventRepository } from "../../domain/repositories/IAgentEventRepository";
import { pool } from "../../infrastructure/database/pool";

export class AnalyticsService {
  constructor(
    private claimRepo: IClaimRepository,
    private investigationRepo: IInvestigationRepository,
    private fraudRepo: IFraudRepository,
    private agentEventRepo: IAgentEventRepository
  ) {}

  async getDashboardKPIs() {
    const [statusCounts, fraudAlertCount, investigations] = await Promise.all([
      this.claimRepo.getStatusCounts(),
      this.fraudRepo.getAlertCount(false),
      this.investigationRepo.list({ limit: 1000 }),
    ]);

    const totalClaims = Object.values(statusCounts).reduce((a, b) => a + b, 0);
    const completedInvestigations = investigations.filter((i) => i.status === "complete" || i.status === "escalated");
    const escalations = investigations.filter((i) => i.status === "escalated").length;

    // Calculate average settlement time (hours)
    const avgSettlementHrs = completedInvestigations.length > 0
      ? completedInvestigations.reduce((sum, inv) => {
          if (inv.completedAt && inv.startedAt) {
            return sum + (new Date(inv.completedAt).getTime() - new Date(inv.startedAt).getTime()) / 3600000;
          }
          return sum;
        }, 0) / completedInvestigations.length
      : 0;

    return {
      totalClaims,
      investigatedToday: completedInvestigations.length,
      fraudAlerts: fraudAlertCount,
      avgSettlementHrs: Math.round(avgSettlementHrs * 10) / 10,
      automationRate: totalClaims > 0 ? Math.round((completedInvestigations.length / Math.max(totalClaims, 1)) * 100) : 0,
      escalations,
      statusCounts,
    };
  }

  async getSettlementTrend(days: number = 14) {
    const { rows } = await pool.query(`
      SELECT 
        DATE(completed_at) as day,
        COUNT(*) FILTER (WHERE recommendation_tone = 'success') as auto_approved,
        COUNT(*) FILTER (WHERE recommendation_tone IN ('warning', 'danger')) as manual_review,
        AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600) as avg_cycle_hrs
      FROM investigations
      WHERE completed_at IS NOT NULL AND completed_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(completed_at)
      ORDER BY day DESC
      LIMIT $1
    `, [days]);

    return rows.map((r: any) => ({
      day: r.day,
      ai: parseInt(r.auto_approved || "0"),
      manual: parseInt(r.manual_review || "0"),
      cycleHrs: parseFloat(r.avg_cycle_hrs || "0").toFixed(1),
    }));
  }

  async getFraudTrend(months: number = 12) {
    const { rows } = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'Mon') as month,
        EXTRACT(MONTH FROM created_at) as month_num,
        COUNT(*) as detected,
        COUNT(*) FILTER (WHERE resolved = TRUE) as prevented
      FROM fraud_alerts
      WHERE created_at > NOW() - INTERVAL '${months} months'
      GROUP BY TO_CHAR(created_at, 'Mon'), EXTRACT(MONTH FROM created_at)
      ORDER BY month_num
    `, []);

    return rows.map((r: any) => ({
      month: r.month,
      detected: parseInt(r.detected),
      prevented: parseInt(r.prevented),
    }));
  }

  async getRegionHeatmap() {
    return this.claimRepo.getRegionStats();
  }

  async getAgentPerformance() {
    const { rows } = await pool.query(`
      SELECT 
        agent,
        COUNT(*) as total_events,
        COUNT(DISTINCT claim_id) as claims_processed,
        AVG(confidence) as avg_confidence
      FROM agent_events
      GROUP BY agent
      ORDER BY total_events DESC
    `);

    return rows.map((r: any) => ({
      agent: r.agent,
      totalEvents: parseInt(r.total_events),
      claimsProcessed: parseInt(r.claims_processed),
      avgConfidence: r.avg_confidence ? parseFloat(r.avg_confidence).toFixed(2) : null,
    }));
  }
}
