import { Helmet } from "react-helmet-async";
import { NOT_FOUND_SEO } from "@shared/publicSeo";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black text-gray-300">
      <Helmet>
        <title>{NOT_FOUND_SEO.title}</title>
        <meta name="robots" content={NOT_FOUND_SEO.robots} />
      </Helmet>
      <h1 className="text-4xl font-light mb-4 text-gray-100">404</h1>
      <p className="text-lg text-gray-400 mb-2">
        The darkness swallowed this page.
      </p>
      <p className="text-sm text-gray-500 mb-8">
        There is nothing here but silence and shadow.
      </p>
      <a
        href="/"
        className="text-sm text-gray-400 hover:text-gray-200 transition-colors underline underline-offset-4"
      >
        Return to the cave
      </a>
    </div>
  );
}
