import { LoginForm, SmokeyBackground } from "@/components/ui/login-form";

/**
 * Sign-in: an ink-and-smoke full-bleed panel (the dark chrome of the auth
 * layout's left side, extended edge-to-edge) with the glass card floating
 * at its centre. The negative margins cancel the auth layout's padding so
 * the backdrop runs to every edge of the column.
 */
export default function LoginPage() {
  return (
    <div className="relative -mx-6 -my-10 flex min-h-[70vh] flex-1 items-center justify-center overflow-hidden bg-ink px-6 py-12 sm:-mx-12 sm:px-12">
      <SmokeyBackground color="#2f4fd8" />
      <div className="relative z-10 flex w-full justify-center">
        <LoginForm />
      </div>
    </div>
  );
}