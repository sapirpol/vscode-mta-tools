import * as _ from "lodash";
import * as vscode from "vscode"; // NOSONAR
import { Utils } from "../utils/utils";
import { SelectionItem } from "../utils/selectionItem";
import { messages } from "../i18n/messages";
import { getClassLogger } from "../logger/logger-wrapper";
import { IChildLogger } from "@vscode-logging/logger";

const MBT_COMMAND = "mbt";
const homeDir = require("os").homedir();

export class MtaBuildCommand {
  private path: string;

  // Logger
  private readonly logger: IChildLogger = getClassLogger(MtaBuildCommand.name);

  public async mtaBuildCommand(selected: vscode.Uri): Promise<void> {
    // check that mbt is installed in the environment
    if (
      !(await Utils.isCliToolInstalled(
        MBT_COMMAND,
        messages.INSTALL_MBT,
        this.logger
      ))
    ) {
      return;
    }

    if (selected) {
      this.path = selected.path;
    } else {
      const mtaYamlFilesPaths = await vscode.workspace.findFiles(
        "**/mta.yaml",
        "**/node_modules/**"
      );
      const len = mtaYamlFilesPaths.length;
      if (len === 0) {
        vscode.window.showErrorMessage(messages.NO_PROJECT_DESCRIPTOR);
        return;
      } else if (len === 1) {
        this.path = mtaYamlFilesPaths[0].path;
      } else {
        const inputRequest = messages.SELECT_PROJECT_DESCRIPTOR;
        const selectionItems: SelectionItem[] = await SelectionItem.getSelectionItems(
          mtaYamlFilesPaths
        );
        const userSelection: vscode.QuickPickItem = await Utils.displayOptions(
          inputRequest,
          selectionItems
        );
        this.logger.info(
          `The user selection file path: ${userSelection.label}`
        );
        this.path = userSelection.label;
      }
    }

    this.path = Utils.isWindows() ? _.trimStart(this.path, "/") : this.path;

    const options: vscode.ShellExecutionOptions = { cwd: homeDir };
    const execution = new vscode.ShellExecution(
      MBT_COMMAND +
        " build -s " +
        "'" +
        _.replace(this.path, "/mta.yaml", "") +
        "'; sleep 2;",
      options
    );
    this.logger.info(`Build MTA starts`);
    Utils.execTask(execution, messages.BUILD_MTA);
  }
}
