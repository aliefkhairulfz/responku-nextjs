"use client";

import { useForm } from "@tanstack/react-form";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const passwordSchema = z
    .object({
        currentPassword: z.string().min(1, "Kata sandi saat ini wajib diisi."),
        newPassword: z
            .string()
            .min(8, "Kata sandi baru minimal 8 karakter.")
            .regex(/[a-z]/, "Kata sandi harus mengandung huruf kecil.")
            .regex(/[A-Z]/, "Kata sandi harus mengandung huruf besar.")
            .regex(/[0-9]/, "Kata sandi harus mengandung angka."),
        confirmPassword: z.string().min(1, "Ulangi kata sandi baru."),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        path: ["confirmPassword"],
        error: "Kata sandi baru tidak cocok.",
    })
    .refine((data) => data.currentPassword !== data.newPassword, {
        path: ["newPassword"],
        error: "Kata sandi baru harus berbeda dari kata sandi saat ini.",
    });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function FieldErrors({ errors }: { errors: unknown[] }) {
    return errors.map((error, index) => (
        <p className="text-sm text-red-500" key={index}>
            {typeof error === "string"
                ? error
                : error && typeof error === "object" && "message" in error
                  ? String(error.message)
                  : "Input tidak valid."}
        </p>
    ));
}

export default function SecurityAndPassword() {
    const [visiblePasswords, setVisiblePasswords] = useState({
        current: false,
        new: false,
        confirm: false,
    });

    const form = useForm({
        defaultValues: {
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
        } as PasswordFormValues,
        validators: {
            onSubmit: passwordSchema,
        },
        onSubmit: async ({ value }) => {
            console.log(value);
        },
    });

    const toggleVisibility = (field: keyof typeof visiblePasswords) => {
        setVisiblePasswords((current) => ({
            ...current,
            [field]: !current[field],
        }));
    };

    return (
        <div>
            <div>
                <h3 className="text-xl font-semibold leading-snug">Ubah Kata Sandi</h3>
                <p className="leading-relaxed text-muted-foreground">Pastikan menggunakan kata sandi kuat dan unik untuk keamanan akun.</p>
            </div>

            <Separator className="my-4" />

            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    form.handleSubmit();
                }}
                className="space-y-6"
            >
                <form.Field name="currentPassword">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Kata Sandi Saat Ini</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    type={visiblePasswords.current ? "text" : "password"}
                                    autoComplete="current-password"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label={visiblePasswords.current ? "Sembunyikan kata sandi saat ini" : "Tampilkan kata sandi saat ini"}
                                    onClick={() => toggleVisibility("current")}
                                >
                                    {visiblePasswords.current ? <Eye /> : <EyeOff />}
                                </Button>
                            </div>
                            <FieldErrors errors={field.state.meta.errors} />
                        </div>
                    )}
                </form.Field>

                <form.Field name="newPassword">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Kata Sandi Baru</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    type={visiblePasswords.new ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label={visiblePasswords.new ? "Sembunyikan kata sandi baru" : "Tampilkan kata sandi baru"}
                                    onClick={() => toggleVisibility("new")}
                                >
                                    {visiblePasswords.new ? <Eye /> : <EyeOff />}
                                </Button>
                            </div>
                            <FieldErrors errors={field.state.meta.errors} />
                        </div>
                    )}
                </form.Field>

                <form.Field name="confirmPassword">
                    {(field) => (
                        <div className="space-y-2">
                            <Label htmlFor={field.name}>Ulangi Kata Sandi Baru</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id={field.name}
                                    name={field.name}
                                    type={visiblePasswords.confirm ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={field.state.value}
                                    onBlur={field.handleBlur}
                                    onChange={(event) => field.handleChange(event.target.value)}
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    aria-label={visiblePasswords.confirm ? "Sembunyikan konfirmasi kata sandi" : "Tampilkan konfirmasi kata sandi"}
                                    onClick={() => toggleVisibility("confirm")}
                                >
                                    {visiblePasswords.confirm ? <Eye /> : <EyeOff />}
                                </Button>
                            </div>
                            <FieldErrors errors={field.state.meta.errors} />
                        </div>
                    )}
                </form.Field>

                <Separator className="my-4" />

                <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
                    {([canSubmit, isSubmitting]) => (
                        <Button type="submit" disabled={!canSubmit || isSubmitting}>
                            Ubah Kata Sandi
                        </Button>
                    )}
                </form.Subscribe>
            </form>
        </div>
    );
}
