import { Skel, SkelLine, SkelRoot } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkelRoot>
      <div className="page-head">
        <div className="titles">
          <SkelLine w={110} h={12} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <SkelLine w={210} h={26} box={34} />
            <Skel w={92} h={24} tag />
          </div>
          <SkelLine w={280} h={12} />
        </div>
      </div>

      <div className="email-grid">
        <div style={{ display: "flex", flexDirection: "column", gap: 24, minWidth: 0 }}>
          <section className="card steps" aria-hidden="true">
            {[0, 1, 2].map((i) => (
              <div className="step" key={i}>
                <Skel w={28} h={28} round />
                <div className="step-body">
                  <SkelLine w={230} h={14} box={22} />
                  <SkelLine w="88%" h={12} />
                  <SkelLine w="62%" h={12} />
                  {i === 0 && <Skel w={150} h={36} r="var(--radius-sm)" style={{ marginTop: 4 }} />}
                </div>
              </div>
            ))}
          </section>
        </div>

        <aside style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <section className="card" aria-hidden="true">
            <div className="facts" style={{ margin: 0 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div className="fact" key={i}>
                  <SkelLine w={90} />
                  <SkelLine w={i % 2 ? 60 : 110} />
                </div>
              ))}
            </div>
          </section>

          <div className="actions" aria-hidden="true">
            <Skel w={130} h={30} r="var(--radius-sm)" />
            <Skel w={64} h={30} r="var(--radius-sm)" />
          </div>
        </aside>
      </div>
    </SkelRoot>
  );
}
