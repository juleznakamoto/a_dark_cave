import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { SocialPromptAdminAggregate } from "@shared/socialPromptAdminStats";

function formatPct(p: number): string {
  return `${p.toFixed(p % 1 === 0 ? 0 : 1)}%`;
}

export default function SocialPromptTab(props: {
  aggregate: SocialPromptAdminAggregate;
}) {
  const { aggregate } = props;

  const stepHistData = [0, 1, 2, 3, 4, 5, 6].map((step) => ({
    step: String(step),
    users: aggregate.exclusive.stepHistogram[step] ?? 0,
  }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Social prompt dialog — cohort</CardTitle>
          <CardDescription>{aggregate.cohortNote}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tabular-nums">
            {aggregate.cohortCloudSaves}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Cloud saves in this sample (users with{" "}
            <code className="text-xs">user_id</code>).
          </p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Task completion (A)</CardTitle>
            <CardDescription>
              Count and share of cloud-save cohort; fields from{" "}
              <code className="text-xs">game_state</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {(
              [
                [
                  "Sign-up / welcome gold",
                  aggregate.taskPct.signUp,
                  aggregate.taskCounts.signUp,
                ],
                [
                  "Email reward claimed",
                  aggregate.taskPct.emailClaimed,
                  aggregate.taskCounts.emailClaimed,
                ],
                [
                  "Instagram claimed",
                  aggregate.taskPct.instagram,
                  aggregate.taskCounts.instagram,
                ],
                [
                  "Reddit claimed",
                  aggregate.taskPct.reddit,
                  aggregate.taskCounts.reddit,
                ],
                [
                  "Both socials",
                  aggregate.taskPct.bothSocial,
                  aggregate.taskCounts.bothSocial,
                ],
                [
                  "Either social",
                  aggregate.taskPct.eitherSocial,
                  aggregate.taskCounts.eitherSocial,
                ],
                [
                  "Playlight discover",
                  aggregate.taskPct.playlightDiscover,
                  aggregate.taskCounts.playlightDiscover,
                ],
                [
                  "≥1 invite (referrer)",
                  aggregate.taskPct.atLeastOneInvite,
                  aggregate.taskCounts.atLeastOneInvite,
                ],
                [
                  "Invite cap (10)",
                  aggregate.taskPct.inviteCap10,
                  aggregate.taskCounts.inviteCap10,
                ],
              ] as const
            ).map(([label, pct, count]) => (
              <div
                key={label}
                className="flex justify-between gap-2 border-b border-border/60 pb-2 last:border-0"
              >
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium tabular-nums text-right">
                  {count}
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    ({formatPct(pct)})
                  </span>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exclusive promo funnel (B)</CardTitle>
            <CardDescription>
              Pending flag, item grant, and step histogram (0–6) using the same
              rules as the in-game exclusive track
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                All 6 steps complete (save)
              </span>
              <span className="font-medium tabular-nums">
                {aggregate.exclusive.completeLogical}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                <code className="text-xs">
                  socialPromoExclusiveRewardPending
                </code>
              </span>
              <span className="font-medium tabular-nums">
                {aggregate.exclusive.pending}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">
                <code className="text-xs">clothing.gifted_ring</code>
              </span>
              <span className="font-medium tabular-nums">
                {aggregate.exclusive.giftedRing}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Steps complete — distribution (B)</CardTitle>
          <CardDescription>
            Users per count of exclusive-track steps done (0–6)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{}} className="h-[300px] w-full">
            <BarChart data={stepHistData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="step" tick={{ fontSize: 11 }} />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="users"
                fill="var(--chart-2)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  );
}
