import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/lib/auth/stack";

export default function Handler(props: { params: { stack: string[] } }) {
    return <StackHandler fullPage app={stackServerApp} {...props} />;
}
