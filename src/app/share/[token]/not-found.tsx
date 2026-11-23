import { AuthFrame, AuthHead } from "@/components/AuthFrame";

export default function ShareNotFound() {
  return (
    <AuthFrame>
      <AuthHead title={"This link isn't available any more"}>
        The person who sent it may have turned it off or made a new one. Ask them for the latest link.
      </AuthHead>
    </AuthFrame>
  );
}
