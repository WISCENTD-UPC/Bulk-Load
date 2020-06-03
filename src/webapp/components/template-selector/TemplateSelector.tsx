import { Checkbox, FormControlLabel, makeStyles } from "@material-ui/core";
import { DatePicker, OrgUnitsSelector } from "d2-ui-components";
import _ from "lodash";
import moment from "moment";
import React, { useEffect, useMemo, useState } from "react";
import { CompositionRoot } from "../../../CompositionRoot";
import { DataForm, DataFormType } from "../../../domain/entities/DataForm";
import { Theme } from "../../../domain/entities/Theme";
import { DownloadTemplateProps } from "../../../domain/usecases/DownloadTemplateUseCase";
import i18n from "../../../locales";
import { cleanOrgUnitPaths } from "../../../utils/dhis";
import { PartialBy } from "../../../utils/types";
import { useAppContext } from "../../contexts/api-context";
import Settings from "../../logic/settings";
import { Select, SelectOption } from "../select/Select";

type DataSource = Record<DataFormType, DataForm[]>;

type PickerUnit = "year" | "month" | "date";
interface PickerFormat {
    unit: PickerUnit;
    views: PickerUnit[];
    format: string;
}

export interface TemplateSelectorProps {
    settings: Settings;
    themes: Theme[];
    onChange(state: DownloadTemplateProps | null): void;
}

export const TemplateSelector = ({ settings, themes, onChange }: TemplateSelectorProps) => {
    const classes = useStyles();
    const { api } = useAppContext();

    const orgUnitSelectionEnabled = settings.orgUnitSelection !== "import";
    const [dataSource, setDataSource] = useState<DataSource>();
    const [templates, setTemplates] = useState<{ value: string; label: string }[]>([]);
    const [orgUnitTreeRootIds, setOrgUnitTreeRootIds] = useState<string[]>([]);
    const [orgUnitTreeFilter, setOrgUnitTreeFilter] = useState<string[]>([]);
    const [availableLanguages, setAvailableLanguages] = useState<SelectOption[]>([]);
    const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>([]);
    const [datePickerFormat, setDatePickerFormat] = useState<PickerFormat>();
    const [userHasReadAccess, setUserHasReadAccess] = useState<boolean>(false);
    const [filterOrgUnits, setFilterOrgUnits] = useState<boolean>(orgUnitSelectionEnabled);
    const [state, setState] = useState<PartialBy<DownloadTemplateProps, "type" | "id">>({
        startDate: moment().add("-1", "year").startOf("year"),
        endDate: moment(),
        populate: false,
        language: "en",
    });

    const models = useMemo(
        () =>
            _.compact([
                settings.isModelEnabled("dataSet") && {
                    value: "dataSets",
                    label: i18n.t("Data Set"),
                },
                settings.isModelEnabled("program") && {
                    value: "programs",
                    label: i18n.t("Program"),
                },
            ]),
        [settings]
    );

    useEffect(() => {
        CompositionRoot.attach()
            .templates.list.execute()
            .then(dataSource => {
                setDataSource(dataSource);
                if (models.length === 1) {
                    const model = models[0].value as DataFormType;
                    const templates = modelToSelectOption(dataSource[model]);
                    setTemplates(templates);
                    setState(state => ({ ...state, type: model }));
                }
            });
    }, [models]);

    useEffect(() => {
        const { type, id } = state;
        if (type && id) {
            CompositionRoot.attach()
                .orgUnits.getRootsByForm.execute(type, id)
                .then(setOrgUnitTreeFilter);
        }
    }, [state]);

    useEffect(() => {
        CompositionRoot.attach().orgUnits.getUserRoots.execute().then(setOrgUnitTreeRootIds);
    }, []);

    useEffect(() => {
        CompositionRoot.attach().languages.list.execute().then(setAvailableLanguages);
    }, []);

    useEffect(() => {
        const { type, id, ...rest } = state;
        if (type && id) {
            const orgUnits = filterOrgUnits
                ? cleanOrgUnitPaths(selectedOrgUnits)
                : orgUnitTreeFilter;
            onChange({ type, id, orgUnits, ...rest });
        } else {
            onChange(null);
        }
    }, [state, selectedOrgUnits, filterOrgUnits, orgUnitTreeFilter, onChange]);

    const themeOptions = dataSource ? modelToSelectOption(themes) : [];

    const clearPopulateDates = () => {
        setState(state => ({ ...state, populateStartDate: undefined, populateEndDate: undefined }));
    };

    const onModelChange = ({ value }: SelectOption) => {
        if (!dataSource) return;

        const type = value as DataFormType;
        const options = modelToSelectOption(dataSource[type]);

        setState(state => ({ ...state, type, id: undefined, populate: false }));
        clearPopulateDates();
        setTemplates(options);
        setSelectedOrgUnits([]);
        setOrgUnitTreeFilter([]);
        setUserHasReadAccess(false);
    };

    const onTemplateChange = ({ value }: SelectOption) => {
        if (dataSource && state.type) {
            const { periodType, readAccess = false } =
                dataSource[state.type].find(({ id }) => id === value) ?? {};
            setUserHasReadAccess(readAccess);

            if (periodType === "Yearly") {
                setDatePickerFormat({ unit: "year", views: ["year"], format: "YYYY" });
            } else if (periodType === "Monthly") {
                setDatePickerFormat({
                    unit: "month",
                    views: ["year", "month"],
                    format: "MMMM YYYY",
                });
            } else {
                setDatePickerFormat(undefined);
            }
        }

        setState(state => ({ ...state, id: value, populate: false }));
        clearPopulateDates();
        setSelectedOrgUnits([]);
    };

    const onThemeChange = ({ value }: SelectOption) => {
        setState(state => ({ ...state, theme: value }));
    };

    const onStartDateChange = (field: keyof DownloadTemplateProps, date: Date, clear = false) => {
        const { unit = "date" } = datePickerFormat ?? {};
        const startDate = date ? moment(date).startOf(unit) : undefined;
        setState(state => ({ ...state, [field]: startDate }));
        if (clear) clearPopulateDates();
    };

    const onEndDateChange = (field: keyof DownloadTemplateProps, date: Date, clear = false) => {
        const { unit = "date" } = datePickerFormat ?? {};
        const endDate = date ? moment(date).endOf(unit) : undefined;
        setState(state => ({ ...state, [field]: endDate }));
        if (clear) clearPopulateDates();
    };

    const onOrgUnitChange = (orgUnitPaths: string[]) => {
        setSelectedOrgUnits(orgUnitPaths);
    };

    const onPopulateChange = (_event: React.ChangeEvent, populate: boolean) => {
        setState(state => ({ ...state, populate }));
    };

    const onFilterOrgUnitsChange = (_event: React.ChangeEvent, filterOrgUnits: boolean) => {
        setState(state => ({ ...state, populate: false }));
        clearPopulateDates();
        setFilterOrgUnits(filterOrgUnits);
    };

    const onLanguageChange = ({ value }: SelectOption) => {
        setState(state => ({ ...state, language: value }));
    };

    const showModelsSelector = models.length > 1;

    return (
        <React.Fragment>
            <h3>{i18n.t("Template properties")}</h3>

            <div className={classes.row}>
                {showModelsSelector && (
                    <div className={classes.select}>
                        <Select
                            placeholder={i18n.t("Data Model")}
                            onChange={onModelChange}
                            options={models}
                            value={state.type ?? ""}
                        />
                    </div>
                )}

                <div className={classes.select}>
                    <Select
                        placeholder={i18n.t("Select element to export...")}
                        onChange={onTemplateChange}
                        options={templates}
                        value={state.id ?? ""}
                    />
                </div>
            </div>

            {state.type === "dataSets" && (
                <div className={classes.row}>
                    <div className={classes.select}>
                        <DatePicker
                            className={classes.fullWidth}
                            label={i18n.t("Start period")}
                            value={state.startDate ?? null}
                            onChange={(date: Date) => onStartDateChange("startDate", date, true)}
                            maxDate={state.endDate}
                            views={datePickerFormat?.views}
                            format={datePickerFormat?.format}
                            InputLabelProps={{ style: { color: "#494949" } }}
                        />
                    </div>
                    <div className={classes.select}>
                        <DatePicker
                            className={classes.fullWidth}
                            label={i18n.t("End period")}
                            value={state.endDate ?? null}
                            onChange={(date: Date) => onEndDateChange("endDate", date, true)}
                            minDate={state.startDate}
                            views={datePickerFormat?.views}
                            format={datePickerFormat?.format}
                            InputLabelProps={{ style: { color: "#494949" } }}
                        />
                    </div>
                </div>
            )}

            {orgUnitSelectionEnabled && (
                <React.Fragment>
                    <h3>{i18n.t("Organisation units")}</h3>

                    <div>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={filterOrgUnits}
                                    onChange={onFilterOrgUnitsChange}
                                />
                            }
                            label={i18n.t("Select available Organisation Units")}
                        />
                    </div>

                    {filterOrgUnits &&
                        (!_.isEmpty(orgUnitTreeRootIds) ? (
                            <div className={classes.orgUnitSelector}>
                                <OrgUnitsSelector
                                    api={api}
                                    rootIds={orgUnitTreeRootIds}
                                    selectableIds={orgUnitTreeFilter}
                                    selected={selectedOrgUnits}
                                    onChange={onOrgUnitChange}
                                    fullWidth={false}
                                    height={250}
                                    controls={{
                                        filterByLevel: true,
                                        filterByGroup: true,
                                        selectAll: true,
                                    }}
                                    withElevation={false}
                                />
                            </div>
                        ) : (
                            <div className={classes.orgUnitError}>
                                {i18n.t("User does not have any capture organisations units")}
                            </div>
                        ))}
                </React.Fragment>
            )}

            <h3>{i18n.t("Advanced properties")}</h3>

            {availableLanguages.length > 0 && (
                <div className={classes.row}>
                    <div className={classes.select}>
                        <Select
                            placeholder={i18n.t("Language")}
                            onChange={onLanguageChange}
                            options={availableLanguages}
                            value={state.language ?? ""}
                        />
                    </div>
                </div>
            )}
            {themeOptions.length > 0 && (
                <div className={classes.row}>
                    <div className={classes.select}>
                        <Select
                            placeholder={i18n.t("Theme")}
                            onChange={onThemeChange}
                            options={themeOptions}
                            allowEmpty={true}
                            emptyLabel={i18n.t("<No value>")}
                            value={state.theme ?? ""}
                        />
                    </div>
                </div>
            )}

            {userHasReadAccess && (
                <div>
                    <FormControlLabel
                        className={classes.checkbox}
                        control={<Checkbox checked={state.populate} onChange={onPopulateChange} />}
                        label={i18n.t("Populate template with data")}
                    />
                </div>
            )}

            {state.populate && (
                <div className={classes.row}>
                    <div className={classes.select}>
                        <DatePicker
                            className={classes.fullWidth}
                            label={i18n.t("Start date")}
                            value={state.populateStartDate ?? null}
                            onChange={(date: Date) => onStartDateChange("populateStartDate", date)}
                            minDate={state.type === "dataSets" ? state.startDate : undefined}
                            maxDate={moment.min(
                                _.compact([
                                    state.type === "dataSets" && state.endDate,
                                    state.populateEndDate,
                                ])
                            )}
                            views={datePickerFormat?.views}
                            format={datePickerFormat?.format}
                            InputLabelProps={{ style: { color: "#494949" } }}
                        />
                    </div>
                    <div className={classes.select}>
                        <DatePicker
                            className={classes.fullWidth}
                            label={i18n.t("End date")}
                            value={state.populateEndDate ?? null}
                            onChange={(date: Date) => onEndDateChange("populateEndDate", date)}
                            minDate={moment.max(
                                _.compact([
                                    state.type === "dataSets" && state.startDate,
                                    state.populateStartDate,
                                ])
                            )}
                            maxDate={state.type === "dataSets" ? state.endDate : undefined}
                            views={datePickerFormat?.views}
                            format={datePickerFormat?.format}
                            InputLabelProps={{ style: { color: "#494949" } }}
                        />
                    </div>
                </div>
            )}
        </React.Fragment>
    );
};

const useStyles = makeStyles({
    row: {
        display: "flex",
        flexFlow: "row nowrap",
        justifyContent: "space-around",
        marginRight: "1em",
    },
    select: { flexBasis: "100%", margin: "0.5em", marginLeft: 0 },
    checkbox: { marginTop: "1em" },
    orgUnitSelector: { marginTop: "1em", marginBottom: "2em" },
    fullWidth: { width: "100%" },
    orgUnitError: {
        height: 250,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
});

function modelToSelectOption<T extends { id: string; name: string }>(array: T[]) {
    return (
        array?.map(({ id, name }) => ({
            value: id,
            label: name,
        })) ?? []
    );
}
