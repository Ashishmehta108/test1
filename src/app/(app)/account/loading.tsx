import { Skel, SkelLine, SkelRoot } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkelRoot gap={24} maxWidth={520}>
      <div className="page-head">
        <div className="titles">
          <SkelLine w={110} h={26} box={34} />
          <SkelLine w={240} h={12} />
        </div>
      </div>

      <section className="card card-pad form" aria-hidden="true">
        <SkelLine w={160} h={18} box={26} />
        <div className="field">
          <SkelLine w={140} h={12} box={20} />
          <Skel w="100%" h={40} r="var(--radius-sm)" />
        </div>
        <div className="field">
          <SkelLine w={100} h={12} box={20} />
          <Skel w="100%" h={40} r="var(--radius-sm)" />
          <SkelLine w={120} h={11} box={18} />
        </div>
        <div className="actions">
          <Skel w={160} h={36} r="var(--radius-sm)" />
        </div>
      </section>
    </SkelRoot>
  );
}
