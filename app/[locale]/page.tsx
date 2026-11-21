import HomeComponent from "@/components/home";
import { FAQ_JSON_LD } from "@/config/seo";

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: FAQ_JSON_LD }}
      />
      <HomeComponent />
    </>
  );
}
