import Link from "next/link";
import { AuthFrame, AuthHead } from "@/components/AuthFrame";

export default function NotFound() {
  return (
    <AuthFrame>
      <AuthHead title={"We couldn't find that page"}>
        It may have been deleted, or it belongs to someone else on the team.
      </AuthHead>
      <Link href="/" className="btn">
        Back to results
      </Link>
    </AuthFrame>
  );
}
