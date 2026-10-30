/**
 * Deprecated legacy reference. Not imported and not registered.
 *
 * Phase 3 CSS renames. Active styles use the new selectors.
 * Do not import this file.
 *
 * layout--super-admin -> layout--admin
 * sa-* classes and --sa-* custom properties -> admin-panel-*
 *   Applied together in Hospital Admin, Manager staff detail,
 *   Manager department list, manager.css, and the shared style bridges.
 * DashboardPreview tab id super-admin -> admin
 * DashboardPreview tab id admin -> manager
 * DashboardPreview initial tab stays the Manager preview (state manager).
 *
 * Not renamed, because the target name already exists:
 * .super-admin-login-page -> .admin-login-page
 *   .admin-login-page is already the shared login page class used by Manager.
 * location.state.superAdminProfileTab -> adminProfileTab
 *   adminProfileTab is already the Manager profile tab state key.
 */
