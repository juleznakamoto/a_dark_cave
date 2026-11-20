import { Redirect } from "wouter";

/** Stand-in for a route this build does not show. */
export default function HiddenPage() {
  return <Redirect to="/" />;
}
