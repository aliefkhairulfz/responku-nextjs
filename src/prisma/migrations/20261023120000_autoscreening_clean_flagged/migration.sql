-- Rename the automatic-screening outcome from the demographic vocabulary
-- (`PASS`/`FAIL`/`NEEDS_REVIEW`) to the quality-signal vocabulary
-- (`CLEAN`/`FLAGGED`).
--
-- The old values described eligibility (profile vs research criteria) and are not
-- meaningful under the new meaning, so any that were stored are cleared before the enum
-- is narrowed — leaving them would make MySQL truncate the column instead.

UPDATE `respondent_participations` SET `autoScreeningResult` = NULL;

ALTER TABLE `respondent_participations`
    MODIFY COLUMN `autoScreeningResult` ENUM('CLEAN', 'FLAGGED') NULL;
