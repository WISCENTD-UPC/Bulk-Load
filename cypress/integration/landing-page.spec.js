/// <reference types='Cypress' />

context("Landing page", () => {
    beforeEach(() => {
        cy.login("admin");
        cy.loadPage("/#/");
    });

    it("has page title", () => {
        cy.title().should("equal", "Bulk Load | DHIS2");
    });

    it("shows section Template Generation", () => {
        cy.contains("Template Generation");
    });

    it("shows section Bulk Import", () => {
        cy.contains("Bulk Import");
    });
});
