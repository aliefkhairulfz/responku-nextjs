"use client";

import { useForm } from "@tanstack/react-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "../ui/badge";

const GENDER_OPTIONS = [
    { value: "all", label: "Semua" },
    { value: "male", label: "Laki-laki" },
    { value: "female", label: "Perempuan" },
] as const;

const REGION_OPTIONS = [
    { value: "all", label: "Semua Wilayah Indonesia" },
    { value: "jabodetabek", label: "Jabodetabek" },
    { value: "jawa-lainnya", label: "Pulau Jawa (Luar Jabodetabek)" },
    { value: "luar-jawa", label: "Luar Pulau Jawa" },
] as const;

type Gender = (typeof GENDER_OPTIONS)[number]["value"];
type Region = (typeof REGION_OPTIONS)[number]["value"];

const MIN_AGE = 18;
const MAX_AGE = 80;

const ageSchema = (label: string) =>
    z
        .number(`${label} harus berupa angka.`)
        .int(`${label} harus bilangan bulat.`)
        .min(MIN_AGE, `${label} minimal ${MIN_AGE} tahun.`)
        .max(MAX_AGE, `${label} maksimal ${MAX_AGE} tahun.`);

const formSchema = z
    .object({
        ageMin: ageSchema("Usia minimum"),
        ageMax: ageSchema("Usia maksimum"),
        gender: z.enum(["all", "male", "female"]),
        region: z.enum(["all", "jabodetabek", "jawa-lainnya", "luar-jawa"]),
    })
    .refine((data) => data.ageMin <= data.ageMax, {
        message: "Usia maksimum tidak boleh lebih kecil dari usia minimum.",
        path: ["ageMax"],
    });

export default function RespondentCriteria() {
    const form = useForm({
        defaultValues: {
            ageMin: 18,
            ageMax: 30,
            gender: "all" as Gender,
            region: "all" as Region,
        },
        validators: {
            onSubmit: formSchema,
        },
        onSubmit: async ({ value }) => {
            // TODO: kirim ke API
            console.log(value);
        },
    });

    return (
        <Card className="w-full">
            <CardHeader className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                    <h3 className="text-xl font-semibold leading-snug">Kriteria Target Responden</h3>
                    <p className="leading-relaxed text-muted-foreground">
                        Sistem otomatis hanya mengundang responden yang sesuai dengan kriteria berikut.
                    </p>
                </div>

                <Badge variant="secondary">Standar Akademik</Badge>
            </CardHeader>

            <CardContent>
                <form
                    id="form-respondent-criteria"
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.handleSubmit();
                    }}
                >
                    <FieldGroup>
                        {/* Rentang Usia */}
                        <FieldSet>
                            <FieldLegend variant="label">Rentang Usia Target</FieldLegend>
                            <div className="flex items-start gap-3">
                                <form.Field name="ageMin">
                                    {(field) => {
                                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                                        return (
                                            <Field data-invalid={isInvalid} className="w-28">
                                                <Input
                                                    id="respondent-age-min"
                                                    name={field.name}
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={MIN_AGE}
                                                    max={MAX_AGE}
                                                    aria-label="Usia minimum"
                                                    value={Number.isNaN(field.state.value) ? "" : field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                                                    aria-invalid={isInvalid}
                                                />
                                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                            </Field>
                                        );
                                    }}
                                </form.Field>

                                <span className="pt-2 text-sm text-muted-foreground">s/d</span>

                                <form.Field name="ageMax">
                                    {(field) => {
                                        const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                                        return (
                                            <Field data-invalid={isInvalid} className="w-28">
                                                <Input
                                                    id="respondent-age-max"
                                                    name={field.name}
                                                    type="number"
                                                    inputMode="numeric"
                                                    min={MIN_AGE}
                                                    max={MAX_AGE}
                                                    aria-label="Usia maksimum"
                                                    value={Number.isNaN(field.state.value) ? "" : field.state.value}
                                                    onBlur={field.handleBlur}
                                                    onChange={(e) => field.handleChange(e.target.valueAsNumber)}
                                                    aria-invalid={isInvalid}
                                                />
                                                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                            </Field>
                                        );
                                    }}
                                </form.Field>

                                <span className="pt-2 text-sm text-muted-foreground">Tahun</span>
                            </div>
                        </FieldSet>

                        <div className="grid grid-cols-2">
                            {/* Jenis Kelamin */}
                            <form.Field name="gender">
                                {(field) => {
                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                                    return (
                                        <FieldSet data-invalid={isInvalid}>
                                            <FieldLegend variant="label">Jenis Kelamin</FieldLegend>
                                            <RadioGroup
                                                name={field.name}
                                                value={field.state.value}
                                                onValueChange={(value) => field.handleChange(value as Gender)}
                                                className="flex flex-wrap gap-6"
                                            >
                                                {GENDER_OPTIONS.map((option) => (
                                                    <Field key={option.value} orientation="horizontal" className="w-auto" data-invalid={isInvalid}>
                                                        <RadioGroupItem
                                                            id={`respondent-gender-${option.value}`}
                                                            value={option.value}
                                                            aria-invalid={isInvalid}
                                                        />
                                                        <FieldLabel htmlFor={`respondent-gender-${option.value}`} className="font-normal">
                                                            {option.label}
                                                        </FieldLabel>
                                                    </Field>
                                                ))}
                                            </RadioGroup>
                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                        </FieldSet>
                                    );
                                }}
                            </form.Field>

                            {/* Wilayah / Domisili */}
                            <form.Field name="region">
                                {(field) => {
                                    const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                                    return (
                                        <Field data-invalid={isInvalid}>
                                            <FieldLabel htmlFor="respondent-region">Wilayah / Domisili</FieldLabel>
                                            <Select
                                                name={field.name}
                                                value={field.state.value}
                                                onValueChange={(value) => field.handleChange(value as Region)}
                                            >
                                                <SelectTrigger
                                                    id="respondent-region"
                                                    aria-invalid={isInvalid}
                                                    onBlur={field.handleBlur}
                                                    className="w-full"
                                                >
                                                    <SelectValue placeholder="Pilih wilayah" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {REGION_OPTIONS.map((option) => (
                                                        <SelectItem key={option.value} value={option.value}>
                                                            {option.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                                        </Field>
                                    );
                                }}
                            </form.Field>
                        </div>
                    </FieldGroup>
                </form>
            </CardContent>

            <CardFooter>
                <Field orientation="horizontal">
                    <Button type="button" variant="outline" onClick={() => form.reset()}>
                        Reset
                    </Button>
                    <Button type="submit" form="form-respondent-criteria">
                        Simpan
                    </Button>
                </Field>
            </CardFooter>
        </Card>
    );
}
