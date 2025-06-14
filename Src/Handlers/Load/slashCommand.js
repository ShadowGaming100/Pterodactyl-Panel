const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

async function loadSlashCommands(client, color) {
  try {
    const commands = [];
    const commandSummary = new Map(); // category => array of command names

    const walk = (dir) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);

        if (stat.isDirectory()) {
          walk(filepath); // recurse
        } else if (file.endsWith(".js")) {
          try {
            const command = require(filepath);

            if (!("data" in command) || !("execute" in command)) {
              console.log(color.yellow(`⚠️ Invalid command file (missing data or execute): ${filepath}`));
              continue;
            }

            const category = command.category || "Uncategorized";

            if (!commandSummary.has(category)) {
              commandSummary.set(category, []);
            }
            commandSummary.get(category).push(command.name);

            // Convert the command data to JSON
            const commandData = command.data.toJSON();

            // Add integration_types and contexts for user-installable commands
            commandData.integration_types = [0, 1]; // 0: GUILD_INSTALL, 1: USER_INSTALL
            commandData.contexts = [0, 1, 2]; // 0: GUILD, 1: BOT_DM, 2: PRIVATE_CHANNEL

            client.slashCommands.set(command.name, command);
            commands.push(commandData);
          } catch (err) {
            console.log(color.red(`❌ Failed to load command at ${filepath}: ${err.message}`));
            continue;
          }
        }
      }
    };

    walk(path.join(__dirname, "../../Commands"));

    const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);
    await rest.put(Routes.applicationCommands(client.user.id), { body: commands });

    console.log("\n📊 Slash Command Summary:");
    let total = 0;
    for (const [category, cmds] of commandSummary.entries()) {
      total += cmds.length;
      console.log(color.cyan(`  📁 ${category}: ${cmds.length} command(s)`));
    }
    console.log(color.green(`\n✅ Registered ${total} slash command(s) total.\n`));
  } catch (error) {
    console.error("❌ Error loading slash commands:", error);
  }
}

module.exports = { loadSlashCommands };
