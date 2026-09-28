import { ViewportMarks } from "@/components/ViewportMarks";

export function SiteIntro() {
  return (
    <div aria-hidden="true" className="site-loading-reveal">
      <span className="site-intro-panel site-intro-panel-left" />
      <span className="site-intro-panel site-intro-panel-right" />
      <span className="site-intro-panel site-intro-panel-top" />
      <span className="site-intro-panel site-intro-panel-bottom" />
      <ViewportMarks />
    </div>
  );
}
