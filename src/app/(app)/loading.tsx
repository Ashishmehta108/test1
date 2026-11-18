import { Skel, SkelLine, SkelRoot } from "@/components/Skeleton";

export default function Loading() {
  return (
    <SkelRoot>
      <div className="page-head">
        <div className="titles">
          <SkelLine w={190} h={26} box={34} />
          <SkelLine w={340} h={12} />
        </div>
        <Skel w={144} h={36} r="var(--radius-sm)" />
      </div>

      <section className="stats" aria-hidden="true">
        <div className="stat">
          <SkelLine w={96} h={12} />
          <SkelLine w={70} h={24} box={31} />
          <SkelLine w={120} h={11} />
        </div>
        <div className="stat">
          <SkelLine w={92} h={12} />
          <SkelLine w={70} h={24} box={31} />
          <SkelLine w={84} h={11} />
          <div className="bar">
            <Skel w="40%" h={4} r={2} />
          </div>
        </div>
        <div className="stat">
          <SkelLine w={120} h={12} />
          <SkelLine w={70} h={24} box={31} />
          <SkelLine w={84} h={11} />
          <div className="bar">
            <Skel w="25%" h={4} r={2} />
          </div>
        </div>
        <div className="stat">
          <SkelLine w={110} h={12} />
          <SkelLine w={40} h={24} box={31} />
          <SkelLine w={170} h={11} />
        </div>
      </section>

      <section className="card" aria-hidden="true">
        <div className="toolbar">
          <div className="segmented" style={{ padding: 3 }}>
            <Skel w={44} h={26} r={4} />
            <Skel w={70} h={26} r={4} />
            <Skel w={62} h={26} r={4} />
            <Skel w={92} h={26} r={4} />
            <Skel w={100} h={26} r={4} />
          </div>
          <Skel w={240} h={34} r="var(--radius-sm)" />
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Sent to</th>
                <th className="hide-sm">About</th>
                <th>Status</th>
                <th className="hide-sm">Sent</th>
                <th>First opened</th>
                <th className="r hide-sm">Opens</th>
                <th className="r hide-sm">Clicks</th>
              </tr>
            </thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td>
                    <div className="who">
                      <SkelLine w={150} h={12} />
                      <SkelLine w={190} h={11} box={18} />
                    </div>
                  </td>
                  <td className="hide-sm">
                    <SkelLine w={120} />
                  </td>
                  <td>
                    <Skel w={84} h={24} tag />
                  </td>
                  <td className="hide-sm">
                    <SkelLine w={92} />
                  </td>
                  <td>
                    <SkelLine w={92} />
                  </td>
                  <td className="r hide-sm">
                    <SkelLine w={24} />
                  </td>
                  <td className="r hide-sm">
                    <SkelLine w={24} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SkelRoot>
  );
}
