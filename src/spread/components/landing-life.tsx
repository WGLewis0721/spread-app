import { SAMPLE_CAPACITY } from "@/spread/components/landing-life-data";

type Budget = { name: string; color: string; hours: number };

export function LifeBadge() {
  return <i className="landing-life-badge" aria-hidden="true" />;
}

export function WeeklyTimeBar({ roles }: { roles: readonly Budget[] }) {
  const available = SAMPLE_CAPACITY - roles.reduce((total, role) => total + role.hours, 0);
  return (
    <div
      className="landing-time-bar"
      role="img"
      aria-label={`${roles.map((role) => `${role.name} ${role.hours} hours`).join(", ")}. ${available} hours available to plan.`}
    >
      {roles.map((role) => (
        <span key={role.name} style={{ flexGrow: role.hours, backgroundColor: role.color }}>
          {role.hours}h
        </span>
      ))}
      <span className="landing-time-available" style={{ flexGrow: available }}>{available}h</span>
    </div>
  );
}
