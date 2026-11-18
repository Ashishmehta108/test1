import { Skel, SkelLine, SkelRoot } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkelRoot gap={24} maxWidth={640}>
      <div className="page-head">
        <div className="titles">
          <SkelLine w={100} h={12} />
          <SkelLine w={220} h={26} box={34} />
          <SkelLine w="80%" h={12} />
        </div>
      </div>

      <section className="card card-pad form" aria-hidden="true">
        <div className="row-2">
          <div className="field">
            <SkelLine w={150} h={12} box={20} />
            <Skel w="100%" h={40} r="var(--radius-sm)" />
          </div>
          <div className="field">
            <SkelLine w={120} h={12} box={20} />
            <Skel w="100%" h={40} r="var(--radius-sm)" />
          </div>
        </div>

        <div className="field">
          <SkelLine w={200} h={12} box={20} />
          <Skel w="100%" h={40} r="var(--radius-sm)" />
          <SkelLine w={330} h={11} box={18} />
        </div>

        <div className="field">
          <SkelLine w={210} h={12} box={20} />
          <Skel w="100%" h={96} r="var(--radius-sm)" />
          <SkelLine w={340} h={11} box={18} />
        </div>

        <div className="actions">
          <Skel w={190} h={42} r="var(--radius-sm)" />
        </div>
      </section>
    </SkelRoot>
  );
}
