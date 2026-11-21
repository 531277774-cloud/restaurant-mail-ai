import MDXComponents from "@/components/mdx/MDXComponents";
import { LOCALES } from "@/i18n/routing";
import fs from "fs/promises";
import { Metadata } from "next";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import path from "path";
import remarkGfm from "remark-gfm";

const options = {
  parseFrontmatter: true,
  mdxOptions: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  },
};

async function getMDXContent(locale: string) {
  const dir = path.join(process.cwd(), "content", "contact");
  const read = async (p: string) => {
    try {
      return await fs.readFile(p, "utf-8");
    } catch {
      return "";
    }
  };
  const content = await read(path.join(dir, `${locale}.mdx`));
  return content || (await read(path.join(dir, "en.mdx")));
}

type Params = Promise<{ locale: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Contact — Restaurant Mail AI",
    description:
      "Contact Restaurant Mail AI for questions, feedback, or business inquiries.",
  };
}

export default async function ContactPage({ params }: { params: Params }) {
  const { locale } = await params;
  const content = await getMDXContent(locale);

  return (
    <article className="w-full md:w-3/5 px-2 md:px-12">
      <MDXRemote
        source={content}
        components={MDXComponents}
        options={options}
      />
    </article>
  );
}

export async function generateStaticParams() {
  return LOCALES.map((locale) => ({
    locale,
  }));
}
