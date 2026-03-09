import { InvitationFields } from "@/lib/templates/schema";

export default function MinimalBaptism1(props: InvitationFields) {
  return <div data-template="minimal-baptism-1">{props.names}</div>;
}
