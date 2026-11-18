import { Skel, SkelLine, SkelRoot } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkelRoot>
      <div className="page-head">
        <div className="titles">
          <SkelLine w={82} h={26} box={34} />
          <SkelLine w={420} h={12} />
        </div>
      </div>

      <div className="team-grid">
        <section className="card" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <div className="member" key={i}>
              <Skel w={32} h={32} round />
              <div className="meta" style={{ gap: 6 }}>
                <SkelLine w={150} h={12} />
                <SkelLine w={190} h={11} box={18} />
              </div>
              <div className="member-actions">
                <Skel w={96} h={30} r="var(--radius-sm)" />
              </div>
            </div>
          ))}
        </section>

        <section className="card card-pad" aria-hidden="true">
          <div className="form">
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <SkelLine w={120} h={18} box={26} />
              <SkelLine w={210} h={11} box={20} />
            </div>
            <div className="field">
              <SkelLine w={52} h={12} box={20} />
              <Skel w="100%" h={40} r="var(--radius-sm)" />
            </div>
            <div className="field">
              <SkelLine w={48} h={12} box={20} />
              <Skel w="100%" h={40} r="var(--radius-sm)" />
            </div>
            <Skel w={160} h={36} r="var(--radius-sm)" />
          </div>
        </section>
      </div>
    </SkelRoot>
  );
}
