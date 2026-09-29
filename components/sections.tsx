"use client";

import { Assignments, Calendar, Correspondence, Decisions, Meetings, Overview } from "@/components/diwan";
import { Delegations, Files, Halls, Notes, People } from "@/components/resources";
import {
  Entities, EntityInbox, EntityPerformance, EntityReplies, EntityRequests, EntityStructure, EntityTasks,
} from "@/components/directorates";
import { AdminAudit, AdminEntities, AdminEscalation, AdminRoles, AdminUsers } from "@/components/admin";
import type { Portal } from "@/lib/types";

const views: Record<Portal, Record<string, () => React.JSX.Element>> = {
  diwan: {
    overview: Overview,
    calendar: Calendar,
    meetings: Meetings,
    decisions: Decisions,
    assignments: Assignments,
    correspondence: Correspondence,
    halls: Halls,
    delegations: Delegations,
    files: Files,
    people: People,
    notes: Notes,
  },
  directorates: {
    entities: Entities,
    inbox: EntityInbox,
    tasks: EntityTasks,
    replies: EntityReplies,
    requests: EntityRequests,
    structure: EntityStructure,
    performance: EntityPerformance,
  },
  admin: {
    entities: AdminEntities,
    users: AdminUsers,
    roles: AdminRoles,
    escalation: AdminEscalation,
    audit: AdminAudit,
  },
};

export default function Section({ portal, section }: { portal: Portal; section: string }) {
  const View = views[portal]?.[section];
  if (!View) return null;
  return <View />;
}
