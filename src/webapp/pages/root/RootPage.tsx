//@ts-ignore
import { HeaderBar } from "@dhis2/ui-widgets";
import { makeStyles, Paper } from "@material-ui/core";
import { useSnackbar } from "d2-ui-components";
import React, { useEffect, useMemo, useState } from "react";
import { HashRouter, Redirect, Route, Switch } from "react-router-dom";
import { CompositionRoot } from "../../../CompositionRoot";
import { Theme } from "../../../domain/entities/Theme";
import i18n from "../../../locales";
import { AppDrawer, AppDrawerToggle } from "../../components/drawer/Drawer";
import { useAppContext } from "../../contexts/api-context";
import Settings from "../../logic/settings";
import DownloadTemplatePage from "../download-template/DownloadTemplatePage";
import ImportTemplatePage from "../import-template/ImportTemplatePage";
import SettingsPage from "../settings/SettingsPage";
import ThemesPage from "../themes/ThemesPage";

export interface RouteComponentProps {
    settings: Settings;
    setSettings: (settings: Settings) => void;
    themes: Theme[];
    setThemes: (themes: Theme[]) => void;
}

export interface AppRoute {
    key: string;
    path: string;
    name: string;
    icon: string;
    section: string;
    defaultRoute?: boolean;
    component: (props: RouteComponentProps) => React.ReactElement | null;
    auth?: (settings: Settings) => boolean;
}

const Root = () => {
    const { api } = useAppContext();
    const snackbar = useSnackbar();
    const classes = useStyles();

    const [isOpen, setOpen] = useState(true);
    const [settings, setSettings] = useState<Settings>();
    const [themes, setThemes] = useState<Theme[]>([]);

    useEffect(() => {
        Settings.build(api)
            .then(setSettings)
            .catch(err => snackbar.error(`Cannot load settings: ${err.message || err.toString()}`));
    }, [api, snackbar]);

    useEffect(() => {
        CompositionRoot.attach().themes.list.execute().then(setThemes);
    }, []);

    const routes: AppRoute[] = useMemo(
        () => [
            {
                key: "download",
                name: i18n.t("Download template"),
                icon: "cloud_download",
                path: "/download",
                section: "main",
                auth: (settings: Settings) => settings.isTemplateGenerationVisible(),
                component: (props: RouteComponentProps) => <DownloadTemplatePage {...props} />,
            },
            {
                key: "import",
                name: i18n.t("Import data"),
                icon: "cloud_upload",
                path: "/import",
                section: "main",
                component: (props: RouteComponentProps) => <ImportTemplatePage {...props} />,
            },
            {
                key: "themes",
                name: i18n.t("Themes"),
                icon: "format_paint",
                path: "/themes",
                section: "settings",
                auth: (settings: Settings) => settings.areSettingsVisibleForCurrentUser(),
                component: (props: RouteComponentProps) => <ThemesPage {...props} />,
            },
            {
                key: "settings",
                name: i18n.t("Settings"),
                icon: "settings",
                path: "/settings",
                section: "settings",
                auth: (settings: Settings) => settings.areSettingsVisibleForCurrentUser(),
                component: (props: RouteComponentProps) => <SettingsPage {...props} />,
            },
        ],
        []
    );

    if (!settings) return null;

    const userRoutes = routes.filter(({ auth }) => !auth || auth(settings));
    const defaultRoute = userRoutes.find(({ defaultRoute }) => defaultRoute) ?? userRoutes[0];

    return (
        <HashRouter>
            <div className={classes.flex}>
                <div className={classes.header}>
                    <HeaderBar appName={"Bulk Load"} />
                </div>

                <AppDrawer isOpen={isOpen} routes={userRoutes} />
                <AppDrawerToggle isOpen={isOpen} setOpen={setOpen} />

                <div
                    className={`${classes.content} ${
                        isOpen ? classes.contentOpen : classes.contentCollapsed
                    }`}
                >
                    <Paper className={classes.paper}>
                        <Switch>
                            {defaultRoute && (
                                <Route
                                    exact={true}
                                    path={"/"}
                                    render={() => <Redirect to={defaultRoute.path} />}
                                />
                            )}

                            {userRoutes.map(({ key, path, component }) => (
                                <Route key={key} path={path}>
                                    {component({
                                        settings,
                                        themes,
                                        setSettings,
                                        setThemes,
                                    })}
                                </Route>
                            ))}
                        </Switch>
                    </Paper>
                </div>
            </div>
        </HashRouter>
    );
};

const useStyles = makeStyles({
    flex: { display: "flex" },
    header: { position: "fixed", top: 0, width: "100%", zIndex: 1 },
    paper: { margin: "2em", marginTop: "2em", padding: "2em", height: "95%" },
    content: { flexGrow: 1, marginTop: 50, height: "100%" },
    contentOpen: { marginLeft: 325 },
    contentCollapsed: { marginLeft: 25 },
});

export default Root;
