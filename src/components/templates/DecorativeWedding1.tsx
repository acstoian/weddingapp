import { InvitationFields } from "@/lib/templates/schema";

export default function DecorativeWedding1(props: InvitationFields) {
  return <div data-template="decorative-wedding-1">{props.names}</div>;
}
