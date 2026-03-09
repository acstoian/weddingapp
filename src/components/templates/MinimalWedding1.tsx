import { InvitationFields } from "@/lib/templates/schema";

export default function MinimalWedding1(props: InvitationFields) {
  return <div data-template="minimal-wedding-1">{props.names}</div>;
}
